import type { RegistrationRepository } from "@/domain/repositories";
import {
  isPotentialDuplicateCandidate,
  type RegistrationDuplicateCriteria,
} from "@/domain/registration-duplicates";
import type { Registration, RequestId } from "@/domain/registration";
import { isoDateToGoogleSerial } from "@/infrastructure/google/google-date";
import {
  SheetSchemaError,
  buildRowByHeaders,
  createHeaderMap,
} from "@/infrastructure/google/header-map";
import { parseRegistrationRow } from "@/infrastructure/google/parsers";
import {
  REGISTRATION_HEADERS,
  REGISTRATIONS_TABLE_ID,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import { SheetsApiError, type SheetsClient } from "@/infrastructure/google/sheets-client";
import { isValidIsoDateOnly } from "@/lib/birth-date";
import { logger } from "@/lib/logger";

function workflowDateToCell(value: string | null): string | number {
  if (!value) {
    return "";
  }
  return isValidIsoDateOnly(value) ? isoDateToGoogleSerial(value) : value;
}

function registrationToCells(
  registration: Registration,
): Readonly<Record<string, string | number>> {
  return {
    REGISTRATION_ID: registration.id,
    REQUEST_ID: registration.requestId,
    SUBMITTED_AT: registration.submittedAt,
    OFFERING_ID: registration.offeringId,
    CITY_ID_SNAPSHOT: registration.cityIdSnapshot,
    CITY_NAME_SNAPSHOT: registration.cityNameSnapshot,
    OFFERING_NAME_SNAPSHOT: registration.offeringNameSnapshot,
    PARTICIPANT_FIRST_NAME: registration.participantFirstName,
    PARTICIPANT_LAST_NAME: registration.participantLastName,
    BIRTH_DATE: registration.birthDate ? isoDateToGoogleSerial(registration.birthDate) : "",
    AGE_AT_SUBMISSION: registration.ageAtSubmission,
    GUARDIAN_FIRST_NAME: registration.guardianFirstName ?? "",
    GUARDIAN_LAST_NAME: registration.guardianLastName ?? "",
    PHONE: registration.phone,
    EMAIL: registration.email,
    STATUS: registration.status,
    NOTES: registration.notes,
    PRIVACY_NOTICE_VERSION: registration.privacyNoticeVersion,
    SOURCE: registration.source,
    CREATED_AT: registration.createdAt,
    UPDATED_AT: registration.updatedAt,
    SEASON_ID: registration.seasonId ?? "",
    SEASON_NAME_SNAPSHOT: registration.seasonNameSnapshot ?? "",
    ASSIGNED_GROUP_ID: registration.assignedGroupId ?? "",
    CONTACTED_AT: workflowDateToCell(registration.contactedAt),
    CONFIRMED_AT: workflowDateToCell(registration.confirmedAt),
    CLOSED_AT: workflowDateToCell(registration.closedAt),
    POSSIBLE_DUPLICATE_OF: registration.possibleDuplicateOf ?? "",
    SCHEMA_VERSION: registration.schemaVersion,
  };
}

function columnLabel(columnCount: number): string {
  let remaining = columnCount;
  let label = "";

  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }

  return label;
}

const REGISTRATION_END_COLUMN = columnLabel(REGISTRATION_HEADERS.length);
const REGISTRATION_DATA_RANGE = `${SHEET.registrations}!A:${REGISTRATION_END_COLUMN}`;
const REGISTRATION_HEADER_RANGE = `${SHEET.registrations}!A1:${REGISTRATION_END_COLUMN}1`;
const NATIVE_APPEND_FALLBACK_STATUSES = new Set([500, 502, 503, 504]);
const APPEND_VERIFICATION_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GoogleSheetsRegistrationRepository implements RegistrationRepository {
  private registrationsSnapshot: Promise<readonly Registration[]> | null = null;

  constructor(private readonly client: SheetsClient) {}

  private parseRegistrations(rows: readonly (readonly unknown[])[]): readonly Registration[] {
    const headerRow = rows[0] ?? [];
    const headers = createHeaderMap(headerRow, REGISTRATION_HEADERS);

    return rows
      .slice(1)
      .map((row) => parseRegistrationRow(row, headers))
      .filter((registration): registration is Registration => registration !== null);
  }

  private async fetchRegistrations(stage: string): Promise<readonly Registration[]> {
    try {
      const rows = await this.client.getValues(REGISTRATION_DATA_RANGE, {
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      return this.parseRegistrations(rows);
    } catch (error) {
      if (error instanceof SheetsApiError) {
        logger.error("registration.sheets_operation_failed", {
          status: error.status,
          stage,
          errorType: error.name,
        });
      }
      throw error;
    }
  }

  private readRegistrations(): Promise<readonly Registration[]> {
    if (!this.registrationsSnapshot) {
      this.registrationsSnapshot = this.fetchRegistrations("registrations.read").catch((error) => {
        this.registrationsSnapshot = null;
        throw error;
      });
    }

    return this.registrationsSnapshot;
  }

  private readRegistrationsFresh(stage: string): Promise<readonly Registration[]> {
    return this.fetchRegistrations(stage);
  }

  private matchingRequestId(
    registrations: readonly Registration[],
    requestId: RequestId,
  ): Registration | null {
    const matching = registrations.filter((registration) => registration.requestId === requestId);

    if (matching.length > 1) {
      throw new SheetSchemaError(`Duplicate request ID: ${requestId}`);
    }

    return matching[0] ?? null;
  }

  private async verifyNativeAppendResult(requestId: RequestId): Promise<Registration | null> {
    let registrations = await this.readRegistrationsFresh("registrations.append.verify");
    let stored = this.matchingRequestId(registrations, requestId);
    if (stored) {
      return stored;
    }

    await delay(APPEND_VERIFICATION_DELAY_MS);
    registrations = await this.readRegistrationsFresh("registrations.append.verify_delayed");
    return this.matchingRequestId(registrations, requestId);
  }

  async listAll(): Promise<readonly Registration[]> {
    return this.readRegistrations();
  }

  async findByRequestId(requestId: RequestId): Promise<Registration | null> {
    const registrations = await this.readRegistrations();
    return this.matchingRequestId(registrations, requestId);
  }

  async findPotentialDuplicates(
    criteria: RegistrationDuplicateCriteria,
  ): Promise<readonly Registration[]> {
    const registrations = await this.readRegistrations();
    return registrations.filter((registration) =>
      isPotentialDuplicateCandidate(registration, criteria),
    );
  }

  async create(registration: Registration): Promise<void> {
    let rows: readonly (readonly unknown[])[];
    try {
      rows = await this.client.getValues(REGISTRATION_HEADER_RANGE);
    } catch (error) {
      if (error instanceof SheetsApiError) {
        logger.error("registration.sheets_operation_failed", {
          requestId: registration.requestId,
          registrationId: registration.id,
          status: error.status,
          stage: "registrations.header.read",
          errorType: error.name,
        });
      }
      throw error;
    }

    const headerRow = rows[0] ?? [];
    createHeaderMap(headerRow, REGISTRATION_HEADERS);
    const row = buildRowByHeaders(headerRow, registrationToCells(registration));

    try {
      await this.client.appendTableRow(REGISTRATIONS_TABLE_ID, row);
      this.registrationsSnapshot = null;
      return;
    } catch (error) {
      if (!(error instanceof SheetsApiError)) {
        throw error;
      }

      logger.error("registration.sheets_operation_failed", {
        requestId: registration.requestId,
        registrationId: registration.id,
        status: error.status,
        stage: "registrations.native_table.append",
        errorType: error.name,
      });

      if (!NATIVE_APPEND_FALLBACK_STATUSES.has(error.status)) {
        throw error;
      }

      const stored = await this.verifyNativeAppendResult(registration.requestId);
      if (stored) {
        logger.warn("registration.native_append_ambiguous_but_committed", {
          requestId: registration.requestId,
          registrationId: stored.id,
          status: error.status,
          stage: "registrations.native_table.append",
        });
        this.registrationsSnapshot = null;
        return;
      }

      logger.warn("registration.native_append_fallback_started", {
        requestId: registration.requestId,
        registrationId: registration.id,
        status: error.status,
        stage: "registrations.values.append",
      });

      try {
        await this.client.appendValues(REGISTRATION_DATA_RANGE, [row]);
      } catch (fallbackError) {
        if (fallbackError instanceof SheetsApiError) {
          logger.error("registration.sheets_operation_failed", {
            requestId: registration.requestId,
            registrationId: registration.id,
            status: fallbackError.status,
            stage: "registrations.values.append",
            errorType: fallbackError.name,
          });
        }
        throw fallbackError;
      }

      logger.info("registration.native_append_fallback_succeeded", {
        requestId: registration.requestId,
        registrationId: registration.id,
        stage: "registrations.values.append",
      });
      this.registrationsSnapshot = null;
    }
  }
}
