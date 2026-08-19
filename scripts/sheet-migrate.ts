import { bootstrapSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  LEGACY_REGISTRATION_HEADERS,
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SYSTEM_SCHEMA_VERSION,
} from "../src/infrastructure/google/sheets-contracts";
import { createAdminSheetsClient } from "./_google-admin";

async function migrateV1ToV2() {
  const client = createAdminSheetsClient();
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
  await client.updateValues(
    `${SHEET.settings}!${columnLetter}${versionRows[0]?.rowNumber}:${columnLetter}${versionRows[0]?.rowNumber}`,
    [[String(SYSTEM_SCHEMA_VERSION)]],
  );

  await bootstrapSheetStructure(client);
  console.info("Migrated sheet schema from version 1 to 2.");
}

async function main() {
  const client = createAdminSheetsClient();
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

  if (version > SYSTEM_SCHEMA_VERSION) {
    throw new Error(
      `Sheet schema version ${version} is newer than application version ${SYSTEM_SCHEMA_VERSION}.`,
    );
  }

  if (version === 1 && SYSTEM_SCHEMA_VERSION === 2) {
    await migrateV1ToV2();
    return;
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
