import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  asRequestId,
  type Registration,
} from "../src/domain/registration";
import { GoogleSheetsCatalogRepository } from "../src/infrastructure/google/catalog.repository";
import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import { GoogleSheetsRegistrationRepository } from "../src/infrastructure/google/registration.repository";
import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { REGISTRATION_HEADERS, SHEET } from "../src/infrastructure/google/sheets-contracts";
import { getServerEnv } from "../src/lib/env";
import { createRegistrationId } from "../src/lib/ids";
import { createAdminSheetsClient } from "./_google-admin";

async function clearOwnRegistration(
  client: ReturnType<typeof createAdminSheetsClient>,
  requestId: string,
): Promise<void> {
  const rows = await client.getValues(`${SHEET.registrations}!A:ZZ`);
  const headerRow = rows[0] ?? [];
  const headers = createHeaderMap(headerRow, REGISTRATION_HEADERS);
  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && cell(row, headers, "REQUEST_ID") === requestId,
  );

  if (rowIndex < 1) {
    return;
  }

  const spreadsheetRowNumber = rowIndex + 1;
  await client.clearValues(
    `${SHEET.registrations}!${spreadsheetRowNumber}:${spreadsheetRowNumber}`,
  );
}

async function main() {
  const env = getServerEnv();

  if (env.APP_ENV !== "test") {
    throw new Error("Sheets integration test is hard-blocked unless APP_ENV=test.");
  }

  if (env.ALLOW_TEST_SEED !== "true") {
    throw new Error(
      "Sheets integration test writes synthetic data. Set ALLOW_TEST_SEED=true explicitly.",
    );
  }

  const client = createAdminSheetsClient();
  await validateSheetStructure(client);

  const catalogRepository = new GoogleSheetsCatalogRepository(client);
  const registrationRepository = new GoogleSheetsRegistrationRepository(client);
  const catalog = await catalogRepository.getPublicCatalog();
  const offering = catalog.offerings[0];

  if (!offering) {
    throw new Error("TEST catalog has no active offering for the integration test.");
  }

  const city = catalog.cities.find((candidate) => candidate.id === offering.cityId);
  if (!city) {
    throw new Error("TEST catalog offering references a city that is not public.");
  }

  const now = new Date().toISOString();
  const requestId = asRequestId(randomUUID());
  const registration: Registration = {
    id: createRegistrationId(),
    requestId,
    submittedAt: now,
    offeringId: offering.id,
    cityIdSnapshot: city.id,
    cityNameSnapshot: city.name,
    offeringNameSnapshot: offering.name,
    participantFirstName: "Integration",
    participantLastName: "Test",
    age: 18,
    guardianFirstName: null,
    guardianLastName: null,
    phone: "+48500000000",
    email: "integration-test@example.com",
    status: REGISTRATION_STATUS.new,
    notes: "synthetic integration test",
    privacyNoticeVersion: "integration-test",
    source: REGISTRATION_SOURCE.web,
    createdAt: now,
    updatedAt: now,
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
  };

  let created = false;

  try {
    await registrationRepository.create(registration);
    created = true;

    const stored = await registrationRepository.findByRequestId(requestId);
    assert(stored, "Synthetic Registration was not readable after append.");
    assert.equal(stored.id, registration.id);
    assert.equal(stored.requestId, registration.requestId);
    assert.equal(stored.offeringId, registration.offeringId);
    assert.equal(stored.cityIdSnapshot, registration.cityIdSnapshot);
    assert.equal(stored.participantFirstName, "Integration");
    assert.equal(stored.participantLastName, "Test");
    assert.equal(stored.schemaVersion, REGISTRATION_SCHEMA_VERSION);

    console.info(
      JSON.stringify(
        {
          ok: true,
          test: "real-google-sheets-registration-roundtrip",
          requestId,
          registrationId: registration.id,
        },
        null,
        2,
      ),
    );
  } finally {
    if (created) {
      await clearOwnRegistration(client, requestId);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown Sheets integration test error.");
  process.exitCode = 1;
});
