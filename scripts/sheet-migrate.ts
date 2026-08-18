import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SYSTEM_SCHEMA_VERSION,
} from "../src/infrastructure/google/sheets-contracts";
import { createAdminSheetsClient } from "./_google-admin";

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

  if (version < SYSTEM_SCHEMA_VERSION) {
    throw new Error(
      `Migration from schema version ${version} is not implemented. Refusing to modify the sheet automatically.`,
    );
  }

  console.info(`Sheet schema is at version ${SYSTEM_SCHEMA_VERSION}. No migrations are pending.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown migration error.");
  process.exitCode = 1;
});
