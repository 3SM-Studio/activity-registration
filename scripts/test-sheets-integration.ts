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
import { GoogleSheetsSettingsRepository } from "../src/infrastructure/google/settings.repository";
import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { REGISTRATION_HEADERS, SHEET } from "../src/infrastructure/google/sheets-contracts";
import { calculateAgeAtDate, dateOnlyInPoland } from "../src/lib/birth-date";
import { getServerEnv } from "../src/lib/env";
import { createRegistrationId } from "../src/lib/ids";
import { createAdminSheetsClient } from "./_google-admin";

async function deleteOwnRegistrationRow(
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

  const metadata = await client.getSheetMetadata();
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  if (!registrationSheet) {
    throw new Error("Cannot clean integration row because ZAPISY metadata is missing.");
  }

  await client.batchUpdate([
    {
      deleteDimension: {
        range: {
          sheetId: registrationSheet.sheetId,
          dimension: "ROWS",
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
      },
    },
  ]);
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
  const settingsRepository = new GoogleSheetsSettingsRepository(client);
  const registrationRepository = new GoogleSheetsRegistrationRepository(client);
  const nowDate = new Date();
  const [catalog, settings] = await Promise.all([
    catalogRepository.getPublicCatalog(dateOnlyInPoland(nowDate)),
    settingsRepository.getPublicSettings(),
  ]);
  const offering = catalog.offerings.find(
    (candidate) =>
      candidate.intakeStatus === "OPEN" || candidate.intakeStatus === "WAITLIST_ONLY",
  );

  if (!offering) {
    throw new Error("TEST catalog has no offering accepting registrations for the integration test.");
  }

  const city = catalog.cities.find((candidate) => candidate.id === offering.cityId);
  if (!city) {
    throw new Error("TEST catalog offering references a city that is not public.");
  }

  if (!settings.currentSeasonId) {
    throw new Error("TEST settings have no CURRENT_SEASON_ID for the integration test.");
  }

  const season = await catalogRepository.findSeasonById(settings.currentSeasonId);
  if (!season || !season.active) {
    throw new Error("TEST CURRENT_SEASON_ID does not resolve to an active season.");
  }

  const now = nowDate.toISOString();
  const birthDate = "2000-01-15";
  const ageAtSubmission = calculateAgeAtDate(birthDate, dateOnlyInPoland(nowDate));
  const requestId = asRequestId(randomUUID());
  const registration: Registration = {
    id: createRegistrationId(),
    requestId,
    submittedAt: now,
    seasonId: season.id,
    seasonNameSnapshot: season.name,
    offeringId: offering.id,
    cityIdSnapshot: city.id,
    cityNameSnapshot: city.name,
    offeringNameSnapshot: offering.name,
    participantFirstName: "Integration",
    participantLastName: "Test",
    birthDate,
    ageAtSubmission,
    guardianFirstName: null,
    guardianLastName: null,
    phone: "+48500000000",
    email: "integration-test@example.com",
    status: REGISTRATION_STATUS.new,
    assignedGroupId: null,
    contactedAt: null,
    confirmedAt: null,
    possibleDuplicateOf: null,
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
    assert(stored, "Synthetic Registration was not readable after native table append.");
    assert.equal(stored.id, registration.id);
    assert.equal(stored.requestId, registration.requestId);
    assert.equal(stored.seasonId, registration.seasonId);
    assert.equal(stored.seasonNameSnapshot, registration.seasonNameSnapshot);
    assert.equal(stored.offeringId, registration.offeringId);
    assert.equal(stored.cityIdSnapshot, registration.cityIdSnapshot);
    assert.equal(stored.participantFirstName, "Integration");
    assert.equal(stored.participantLastName, "Test");
    assert.equal(stored.birthDate, birthDate);
    assert.equal(stored.ageAtSubmission, ageAtSubmission);
    assert.equal(stored.assignedGroupId, null);
    assert.equal(stored.contactedAt, null);
    assert.equal(stored.confirmedAt, null);
    assert.equal(stored.possibleDuplicateOf, null);
    assert.equal(stored.schemaVersion, REGISTRATION_SCHEMA_VERSION);

    console.info(
      JSON.stringify(
        {
          ok: true,
          test: "real-google-sheets-native-table-registration-roundtrip",
          requestId,
          registrationId: registration.id,
        },
        null,
        2,
      ),
    );
  } finally {
    if (created) {
      await deleteOwnRegistrationRow(client, requestId);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown Sheets integration test error.");
  process.exitCode = 1;
});
