import { bootstrapSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  LEGACY_OFFERING_HEADERS,
  LEGACY_REGISTRATION_HEADERS,
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SYSTEM_SCHEMA_VERSION,
  V2_REGISTRATION_HEADERS,
} from "../src/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "../src/infrastructure/google/sheets-client";
import { createAdminSheetsClient } from "./_google-admin";

async function setSystemSchemaVersion(client: SheetsClient, version: number): Promise<void> {
  const settingsRows = await client.getValues(`${SHEET.settings}!A:ZZ`);
  const settingsHeaders = createHeaderMap(settingsRows[0] ?? [], SETTINGS_HEADERS);
  const versionRows = settingsRows
    .slice(1)
    .map((row, offset) => ({ row, rowNumber: offset + 2 }))
    .filter(({ row }) => cell(row, settingsHeaders, "KEY") === SETTING_KEY.systemSchemaVersion);

  if (versionRows.length !== 1) {
    throw new Error(
      `Expected exactly one ${SETTING_KEY.systemSchemaVersion} setting, found ${versionRows.length}.`,
    );
  }

  const versionValueColumn = settingsHeaders.get("VALUE");
  if (versionValueColumn === undefined) {
    throw new Error("Missing USTAWIENIA VALUE column.");
  }

  const columnLetter = String.fromCharCode("A".charCodeAt(0) + versionValueColumn);
  const rowNumber = versionRows[0]?.rowNumber;
  if (!rowNumber) {
    throw new Error(`Missing ${SETTING_KEY.systemSchemaVersion} row.`);
  }

  await client.updateValues(`${SHEET.settings}!${columnLetter}${rowNumber}`, [[String(version)]]);
}

async function migrateV1ToV2(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const registrationsSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  if (!registrationsSheet) {
    throw new Error("Missing ZAPISY sheet.");
  }

  const registrationHeaderRows = await client.getValues(`${SHEET.registrations}!1:1`);
  createHeaderMap(registrationHeaderRows[0] ?? [], LEGACY_REGISTRATION_HEADERS);

  await client.batchUpdate([
    {
      insertDimension: {
        range: {
          sheetId: registrationsSheet.sheetId,
          dimension: "COLUMNS",
          startIndex: 9,
          endIndex: 10,
        },
        inheritFromBefore: true,
      },
    },
  ]);

  await client.updateValues(`${SHEET.registrations}!J1:K1`, [["BIRTH_DATE", "AGE_AT_SUBMISSION"]]);
  await setSystemSchemaVersion(client, 2);
  console.info("Migrated sheet schema from version 1 to 2.");
}

async function migrateV2ToV3(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const registrationsSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  const offeringsSheet = metadata.find((sheet) => sheet.title === SHEET.offerings);

  if (!registrationsSheet || !offeringsSheet) {
    throw new Error("Missing OFERTY_ZAJEC or ZAPISY sheet.");
  }

  const [registrationHeaderRows, offeringRows] = await Promise.all([
    client.getValues(`${SHEET.registrations}!1:1`),
    client.getValues(`${SHEET.offerings}!A:ZZ`),
  ]);

  createHeaderMap(registrationHeaderRows[0] ?? [], V2_REGISTRATION_HEADERS);
  createHeaderMap(offeringRows[0] ?? [], LEGACY_OFFERING_HEADERS);

  await client.batchUpdate([
    {
      insertDimension: {
        range: {
          sheetId: offeringsSheet.sheetId,
          dimension: "COLUMNS",
          startIndex: 3,
          endIndex: 4,
        },
        inheritFromBefore: true,
      },
    },
    {
      insertDimension: {
        range: {
          sheetId: offeringsSheet.sheetId,
          dimension: "COLUMNS",
          startIndex: 6,
          endIndex: 11,
        },
        inheritFromBefore: true,
      },
    },
    {
      insertDimension: {
        range: {
          sheetId: registrationsSheet.sheetId,
          dimension: "COLUMNS",
          startIndex: 21,
          endIndex: 27,
        },
        inheritFromBefore: true,
      },
    },
  ]);

  await Promise.all([
    client.updateValues(`${SHEET.offerings}!D1:K1`, [
      [
        "PUBLIC_DESCRIPTION",
        "ACTIVE",
        "SORT_ORDER",
        "REGISTRATION_MODE",
        "INTAKE_STATE",
        "REGISTRATION_OPEN_FROM",
        "REGISTRATION_OPEN_TO",
        "WAITLIST_ENABLED",
      ],
    ]),
    client.updateValues(`${SHEET.registrations}!V1:AA1`, [
      [
        "SEASON_ID",
        "SEASON_NAME_SNAPSHOT",
        "ASSIGNED_GROUP_ID",
        "CONTACTED_AT",
        "CONFIRMED_AT",
        "POSSIBLE_DUPLICATE_OF",
      ],
    ]),
  ]);

  for (const [offset, row] of offeringRows.slice(1).entries()) {
    if (!row.some((value) => String(value ?? "").trim().length > 0)) {
      continue;
    }

    const rowNumber = offset + 2;
    await Promise.all([
      client.updateValues(`${SHEET.offerings}!D${rowNumber}`, [[""]]),
      client.updateValues(`${SHEET.offerings}!G${rowNumber}:K${rowNumber}`, [
        ["ROLLING", "CLOSED", "", "", "FALSE"],
      ]),
    ]);
  }

  // Structural bootstrap must succeed before the sheet advertises schema v3.
  // If it fails, SYSTEM_SCHEMA_VERSION stays at 2 so a later run can detect
  // that the migration is incomplete instead of trusting a partially migrated sheet.
  await bootstrapSheetStructure(client);
  await setSystemSchemaVersion(client, 3);
  console.info("Migrated sheet schema from version 2 to 3.");
}

async function readSchemaVersion(client: SheetsClient): Promise<number> {
  const rows = await client.getValues(`${SHEET.settings}!A:ZZ`);
  const headers = createHeaderMap(rows[0] ?? [], SETTINGS_HEADERS);
  const versionRows = rows
    .slice(1)
    .filter((row) => cell(row, headers, "KEY") === SETTING_KEY.systemSchemaVersion);

  if (versionRows.length !== 1) {
    throw new Error(
      `Expected exactly one ${SETTING_KEY.systemSchemaVersion} setting, found ${versionRows.length}.`,
    );
  }

  const rawVersion = cell(versionRows[0] ?? [], headers, "VALUE");
  const version = Number(rawVersion);

  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Invalid sheet schema version: ${rawVersion || "<empty>"}.`);
  }

  return version;
}

async function main() {
  const client = createAdminSheetsClient();
  let version = await readSchemaVersion(client);

  if (version > SYSTEM_SCHEMA_VERSION) {
    throw new Error(
      `Sheet schema version ${version} is newer than application version ${SYSTEM_SCHEMA_VERSION}.`,
    );
  }

  if (version === 1) {
    await migrateV1ToV2(client);
    version = 2;
  }

  if (version === 2) {
    await migrateV2ToV3(client);
    version = 3;
  }

  if (version < SYSTEM_SCHEMA_VERSION) {
    throw new Error(
      `Migration from schema version ${version} is not implemented. Refusing to modify the sheet automatically.`,
    );
  }

  await bootstrapSheetStructure(client);
  console.info(`Sheet schema is at version ${SYSTEM_SCHEMA_VERSION}. No migrations are pending.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown migration error.");
  process.exitCode = 1;
});
