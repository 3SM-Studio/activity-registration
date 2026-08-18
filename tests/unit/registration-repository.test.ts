import { describe, expect, it } from "vitest";

import { asCityId, asOfferingId } from "@/domain/catalog";
import {
  asRegistrationId,
  asRequestId,
  REGISTRATION_STATUS,
  type Registration,
} from "@/domain/registration";
import { SheetSchemaError } from "@/infrastructure/google/header-map";
import { GoogleSheetsRegistrationRepository } from "@/infrastructure/google/registration.repository";
import { REGISTRATION_HEADERS, SHEET } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

const registration: Registration = {
  id: asRegistrationId("reg_11111111-1111-4111-8111-111111111111"),
  requestId: asRequestId("22222222-2222-4222-8222-222222222222"),
  submittedAt: "2026-08-18T12:00:00.000Z",
  offeringId: asOfferingId("gdynia-hiphop"),
  cityIdSnapshot: asCityId("gdynia"),
  cityNameSnapshot: "Gdynia",
  offeringNameSnapshot: "Hip-hop",
  participantFirstName: "Jan",
  participantLastName: "Kowalski",
  age: 17,
  guardianFirstName: "Anna",
  guardianLastName: "Kowalska",
  phone: "+48500000000",
  email: "anna@example.com",
  status: REGISTRATION_STATUS.new,
  notes: "",
  privacyNoticeVersion: "2026-08-v1",
  source: "WEB",
  createdAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  schemaVersion: 1,
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
    AGE: registration.age,
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

  return headers.map((header) => values[header] ?? "");
}

function createClient(
  headerRow: readonly string[],
  dataRows: readonly (readonly unknown[])[] = [],
): {
  readonly client: SheetsClient;
  readonly appended: (readonly (string | number | boolean)[])[];
} {
  const appended: (readonly (string | number | boolean)[])[] = [];

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
      async appendValues(_range, values) {
        appended.push(...values);
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
  it("writes by header names when the system columns are reordered", async () => {
    const reversedHeaders = [...REGISTRATION_HEADERS].reverse();
    const { client, appended } = createClient(reversedHeaders);
    const repository = new GoogleSheetsRegistrationRepository(client);

    await repository.create(registration);

    expect(appended).toEqual([rowForHeaders(reversedHeaders)]);
  });

  it("reads an idempotent registration from reordered headers", async () => {
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
