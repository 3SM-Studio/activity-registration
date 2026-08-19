import type { RegistrationRepository } from "@/domain/repositories";
import type { Registration, RequestId } from "@/domain/registration";
import { isoDateToGoogleSerial } from "@/infrastructure/google/google-date";
import {
  SheetSchemaError,
  buildRowByHeaders,
  cell,
  createHeaderMap,
} from "@/infrastructure/google/header-map";
import { parseRegistrationRow } from "@/infrastructure/google/parsers";
import {
  REGISTRATION_HEADERS,
  REGISTRATIONS_TABLE_ID,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

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
    SCHEMA_VERSION: registration.schemaVersion,
  };
}

export class GoogleSheetsRegistrationRepository implements RegistrationRepository {
  constructor(private readonly client: SheetsClient) {}

  async findByRequestId(requestId: RequestId): Promise<Registration | null> {
    const rows = await this.client.getValues(`${SHEET.registrations}!A:ZZ`, {
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const headerRow = rows[0] ?? [];
    const headers = createHeaderMap(headerRow, REGISTRATION_HEADERS);

    const matchingRows = rows
      .slice(1)
      .filter((row) => cell(row, headers, "REQUEST_ID") === requestId);

    if (matchingRows.length > 1) {
      throw new SheetSchemaError(`Duplicate request ID: ${requestId}`);
    }

    const matchingRow = matchingRows[0];
    return matchingRow ? parseRegistrationRow(matchingRow, headers) : null;
  }

  async create(registration: Registration): Promise<void> {
    const rows = await this.client.getValues(`${SHEET.registrations}!1:1`);
    const headerRow = rows[0] ?? [];
    createHeaderMap(headerRow, REGISTRATION_HEADERS);

    const row = buildRowByHeaders(headerRow, registrationToCells(registration));
    await this.client.appendTableRow(REGISTRATIONS_TABLE_ID, row);
  }
}
