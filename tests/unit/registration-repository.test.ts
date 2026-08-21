import { describe, expect, it } from "vitest";

import { asCityId, asOfferingId, asSeasonId } from "@/domain/catalog";
import type { RegistrationDuplicateCriteria } from "@/domain/registration-duplicates";
import {
  asRegistrationId,
  asRequestId,
  REGISTRATION_STATUS,
  type Registration,
} from "@/domain/registration";
import { isoDateToGoogleSerial } from "@/infrastructure/google/google-date";
import { SheetSchemaError } from "@/infrastructure/google/header-map";
import { GoogleSheetsRegistrationRepository } from "@/infrastructure/google/registration.repository";
import {
  REGISTRATION_HEADERS,
  REGISTRATIONS_TABLE_ID,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

const registration: Registration = {
  id: asRegistrationId("reg_11111111-1111-4111-8111-111111111111"),
  requestId: asRequestId("22222222-2222-4222-8222-222222222222"),
  submittedAt: "2026-08-18T12:00:00.000Z",
  seasonId: null,
  seasonNameSnapshot: null,
  offeringId: asOfferingId("gdynia-hiphop"),
  cityIdSnapshot: asCityId("gdynia"),
  cityNameSnapshot: "Gdynia",
  offeringNameSnapshot: "Hip-hop",
  participantFirstName: "Jan",
  participantLastName: "Kowalski",
  birthDate: "2009-01-15",
  ageAtSubmission: 17,
  guardianFirstName: "Anna",
  guardianLastName: "Kowalska",
  phone: "+48500000000",
  email: "anna@example.com",
  status: REGISTRATION_STATUS.new,
  assignedGroupId: null,
  contactedAt: null,
  confirmedAt: null,
  closedAt: null,
  possibleDuplicateOf: null,
  notes: "",
  privacyNoticeVersion: "2026-08-v1",
  source: "WEB",
  createdAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  schemaVersion: 2,
};

function workflowDate(value: string | null): string | number {
  if (!value) {
    return "";
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? isoDateToGoogleSerial(value) : value;
}

function rowForHeaders(
  headers: readonly string[],
  record: Registration = registration,
): readonly (string | number)[] {
  const values: Readonly<Record<string, string | number>> = {
    REGISTRATION_ID: record.id,
    REQUEST_ID: record.requestId,
    SUBMITTED_AT: record.submittedAt,
    OFFERING_ID: record.offeringId,
    CITY_ID_SNAPSHOT: record.cityIdSnapshot,
    CITY_NAME_SNAPSHOT: record.cityNameSnapshot,
    OFFERING_NAME_SNAPSHOT: record.offeringNameSnapshot,
    PARTICIPANT_FIRST_NAME: record.participantFirstName,
    PARTICIPANT_LAST_NAME: record.participantLastName,
    BIRTH_DATE: isoDateToGoogleSerial(record.birthDate ?? ""),
    AGE_AT_SUBMISSION: record.ageAtSubmission,
    GUARDIAN_FIRST_NAME: record.guardianFirstName ?? "",
    GUARDIAN_LAST_NAME: record.guardianLastName ?? "",
    PHONE: record.phone,
    EMAIL: record.email,
    STATUS: record.status,
    NOTES: record.notes,
    PRIVACY_NOTICE_VERSION: record.privacyNoticeVersion,
    SOURCE: record.source,
    CREATED_AT: record.createdAt,
    UPDATED_AT: record.updatedAt,
    SEASON_ID: record.seasonId ?? "",
    SEASON_NAME_SNAPSHOT: record.seasonNameSnapshot ?? "",
    ASSIGNED_GROUP_ID: record.assignedGroupId ?? "",
    CONTACTED_AT: workflowDate(record.contactedAt),
    CONFIRMED_AT: workflowDate(record.confirmedAt),
    CLOSED_AT: workflowDate(record.closedAt),
    POSSIBLE_DUPLICATE_OF: record.possibleDuplicateOf ?? "",
    SCHEMA_VERSION: record.schemaVersion,
  };

  return headers.map((header) => values[header] ?? "");
}

function createClient(
  headerRow: readonly string[],
  dataRows: readonly (readonly unknown[])[] = [],
): {
  readonly client: SheetsClient;
  readonly appended: { tableId: string; row: readonly (string | number | boolean)[] }[];
} {
  const appended: { tableId: string; row: readonly (string | number | boolean)[] }[] = [];

  return {
    appended,
    client: {
      async getValues(range) {
        if (range === `${SHEET.registrations}!1:1`) {
          return [headerRow];
        }
        if (range === `${SHEET.registrations}!A:ZZ`) {
          return [headerRow, ...dataRows];
        }
        return [];
      },
      async updateValues() {},
      async appendValues() {},
      async appendTableRow(tableId, row) {
        appended.push({ tableId, row });
      },
      async clearValues() {},
      async getSheetMetadata() {
        return [];
      },
      async batchUpdate() {},
    },
  };
}

describe("GoogleSheetsRegistrationRepository", () => {
  it("writes by header names into the native table when columns are reordered", async () => {
    const reversedHeaders = [...REGISTRATION_HEADERS].reverse();
    const { client, appended } = createClient(reversedHeaders);
    const repository = new GoogleSheetsRegistrationRepository(client);

    await repository.create(registration);

    expect(appended).toEqual([
      { tableId: REGISTRATIONS_TABLE_ID, row: rowForHeaders(reversedHeaders) },
    ]);
  });

  it("reads a schema-v2 idempotent registration from reordered v4 headers", async () => {
    const reorderedHeaders = [
      ...REGISTRATION_HEADERS.slice(8),
      ...REGISTRATION_HEADERS.slice(0, 8),
    ];
    const row = rowForHeaders(reorderedHeaders);
    const { client } = createClient(reorderedHeaders, [row]);
    const repository = new GoogleSheetsRegistrationRepository(client);

    await expect(repository.findByRequestId(registration.requestId)).resolves.toEqual(registration);
  });

  it("round-trips a schema-v4 CLOSED_AT native date", async () => {
    const closed: Registration = {
      ...registration,
      seasonId: asSeasonId("test-2026-2027"),
      seasonNameSnapshot: "2026/2027",
      status: REGISTRATION_STATUS.cancelled,
      closedAt: "2026-09-10",
      schemaVersion: 4,
    };
    const row = rowForHeaders(REGISTRATION_HEADERS, closed);
    const { client } = createClient(REGISTRATION_HEADERS, [row]);
    const repository = new GoogleSheetsRegistrationRepository(client);

    await expect(repository.findByRequestId(closed.requestId)).resolves.toEqual(closed);
  });

  it("returns only business duplicate candidates from parsed registration rows", async () => {
    const candidate: Registration = {
      ...registration,
      id: asRegistrationId("reg_33333333-3333-4333-8333-333333333333"),
      requestId: asRequestId("33333333-3333-4333-8333-333333333333"),
      seasonId: asSeasonId("test-2026-2027"),
      seasonNameSnapshot: "2026/2027",
      schemaVersion: 3,
    };
    const unrelated: Registration = {
      ...candidate,
      id: asRegistrationId("reg_44444444-4444-4444-8444-444444444444"),
      requestId: asRequestId("44444444-4444-4444-8444-444444444444"),
      offeringId: asOfferingId("gdynia-contemporary"),
      offeringNameSnapshot: "Contemporary",
    };
    const rows = [
      rowForHeaders(REGISTRATION_HEADERS, candidate),
      rowForHeaders(REGISTRATION_HEADERS, unrelated),
    ];
    const { client } = createClient(REGISTRATION_HEADERS, rows);
    const repository = new GoogleSheetsRegistrationRepository(client);
    const criteria: RegistrationDuplicateCriteria = {
      seasonId: asSeasonId("test-2026-2027"),
      offeringId: asOfferingId("gdynia-hiphop"),
      cityId: asCityId("gdynia"),
      participantFirstName: "JAN",
      participantLastName: "Kowalski",
      birthDate: "2009-01-15",
      phone: "+48500000000",
      email: "anna@example.com",
    };

    await expect(repository.findPotentialDuplicates(criteria)).resolves.toEqual([candidate]);
  });

  it("fails fast when a matching stored registration has a corrupted technical ID", async () => {
    const headers = [...REGISTRATION_HEADERS];
    const row = [...rowForHeaders(headers)];
    const idIndex = headers.indexOf("REGISTRATION_ID");
    row[idIndex] = "reg-not-a-uuid";

    const { client } = createClient(headers, [row]);
    const repository = new GoogleSheetsRegistrationRepository(client);

    await expect(repository.findByRequestId(registration.requestId)).rejects.toBeInstanceOf(
      SheetSchemaError,
    );
  });
});
