import { describe, expect, it } from "vitest";

import { asCityId, asOfferingId } from "@/domain/catalog";
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
  possibleDuplicateOf: null,
  notes: "",
  privacyNoticeVersion: "2026-08-v1",
  source: "WEB",
  createdAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  schemaVersion: 2,
};

function rowForHeaders(headers: readonly string[]): readonly (string | number)[] {
  const values: Readonly<Record<string, string | number>> = {
    REGISTRATION_ID: registration.id,
    REQUEST_ID: registration.requestId,
    SUBMITTED_AT: registration.submittedAt,
    OFFERING_ID: registration.offeringId,
    CITY_ID_SNAPSHOT: registration.cityIdSnapshot,
    CITY_NAME_SNAPSHOT: registration.cityNameSnapshot,
    OFFERING_NAME_SNAPSHOT: registration.offeringNameSnapshot,
    PARTICIPANT_FIRST_NAME: registration.participantFirstName,
    PARTICIPANT_LAST_NAME: registration.participantLastName,
    BIRTH_DATE: isoDateToGoogleSerial(registration.birthDate ?? ""),
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
    CONTACTED_AT: registration.contactedAt ?? "",
    CONFIRMED_AT: registration.confirmedAt ?? "",
    POSSIBLE_DUPLICATE_OF: registration.possibleDuplicateOf ?? "",
    SCHEMA_VERSION: registration.schemaVersion,
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

  it("reads a schema-v2 idempotent registration from reordered v3 headers", async () => {
    const reorderedHeaders = [
      ...REGISTRATION_HEADERS.slice(8),
      ...REGISTRATION_HEADERS.slice(0, 8),
    ];
    const row = rowForHeaders(reorderedHeaders);
    const { client } = createClient(reorderedHeaders, [row]);
    const repository = new GoogleSheetsRegistrationRepository(client);

    await expect(repository.findByRequestId(registration.requestId)).resolves.toEqual(registration);
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
