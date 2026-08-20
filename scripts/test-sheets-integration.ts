import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  classifyRegistrationDuplicates,
  type RegistrationDuplicateCriteria,
} from "../src/domain/registration-duplicates";
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

async function registrationRowCount(
  client: ReturnType<typeof createAdminSheetsClient>,
): Promise<number> {
  const rows = await client.getValues(`${SHEET.registrations}!A:ZZ`);
  return Math.max(0, rows.length - 1);
}

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
    (candidate) => candidate.intakeStatus === "OPEN" || candidate.intakeStatus === "WAITLIST_ONLY",
  );

  if (!offering) {
    throw new Error(
      "TEST catalog has no offering accepting registrations for the integration test.",
    );
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
  const exactRequestId = asRequestId(randomUUID());
  const probableRequestId = asRequestId(randomUUID());
  const registration: Registration = {
    id: createRegistrationId(),
    requestId: exactRequestId,
    submittedAt: now,
    seasonId: season.id,
    seasonNameSnapshot: season.name,
    offeringId: offering.id,
    cityIdSnapshot: city.id,
    cityNameSnapshot: city.name,
    offeringNameSnapshot: offering.name,
    participantFirstName: "Integration",
    participantLastName: "Dedup Test",
    birthDate,
    ageAtSubmission,
    guardianFirstName: null,
    guardianLastName: null,
    phone: "+48500000000",
    email: "integration-dedup@example.com",
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
  const exactCriteria: RegistrationDuplicateCriteria = {
    seasonId: season.id,
    offeringId: offering.id,
    cityId: city.id,
    participantFirstName: registration.participantFirstName,
    participantLastName: registration.participantLastName,
    birthDate,
    phone: registration.phone,
    email: registration.email,
  };
  const probableCriteria: RegistrationDuplicateCriteria = {
    ...exactCriteria,
    phone: "+48511111111",
  };
  const probableRegistration: Registration = {
    ...registration,
    id: createRegistrationId(),
    requestId: probableRequestId,
    phone: probableCriteria.phone,
    possibleDuplicateOf: registration.id,
    submittedAt: new Date(nowDate.getTime() + 1_000).toISOString(),
    createdAt: new Date(nowDate.getTime() + 1_000).toISOString(),
    updatedAt: new Date(nowDate.getTime() + 1_000).toISOString(),
  };

  const beforeCount = await registrationRowCount(client);
  let exactCreated = false;
  let probableCreated = false;

  try {
    await registrationRepository.create(registration);
    exactCreated = true;

    const stored = await registrationRepository.findByRequestId(exactRequestId);
    assert(stored, "Synthetic Registration was not readable after native table append.");
    assert.equal(stored.id, registration.id);
    assert.equal(stored.seasonId, registration.seasonId);
    assert.equal(stored.birthDate, birthDate);

    const exactCandidates = await registrationRepository.findPotentialDuplicates(exactCriteria);
    const exactMatch = classifyRegistrationDuplicates(exactCandidates, exactCriteria);
    assert.equal(exactMatch.kind, "exact");
    if (exactMatch.kind !== "exact") {
      throw new Error("Expected exact business duplicate classification.");
    }
    assert.equal(exactMatch.registration.id, registration.id);
    assert.equal(
      await registrationRowCount(client),
      beforeCount + 1,
      "Exact duplicate detection must not append another row.",
    );

    const probableCandidates =
      await registrationRepository.findPotentialDuplicates(probableCriteria);
    const probableMatch = classifyRegistrationDuplicates(probableCandidates, probableCriteria);
    assert.equal(probableMatch.kind, "probable");
    if (probableMatch.kind !== "probable") {
      throw new Error("Expected probable business duplicate classification.");
    }
    assert.equal(probableMatch.registration.id, registration.id);

    await registrationRepository.create(probableRegistration);
    probableCreated = true;
    const probableStored = await registrationRepository.findByRequestId(probableRequestId);
    assert(probableStored, "Probable duplicate Registration was not readable after append.");
    assert.equal(probableStored.possibleDuplicateOf, registration.id);
    assert.equal(await registrationRowCount(client), beforeCount + 2);

    console.info(
      JSON.stringify(
        {
          ok: true,
          test: "real-google-sheets-business-deduplication",
          exactDuplicateDidNotAppend: true,
          probableDuplicateLinked: true,
        },
        null,
        2,
      ),
    );
  } finally {
    if (probableCreated) {
      await deleteOwnRegistrationRow(client, probableRequestId);
    }
    if (exactCreated) {
      await deleteOwnRegistrationRow(client, exactRequestId);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown Sheets integration test error.");
  process.exitCode = 1;
});
