import { bootstrapSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  LEGACY_OFFERING_HEADERS,
  LEGACY_REGISTRATION_HEADERS,
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SHEET_SCHEMA,
  SYSTEM_SCHEMA_VERSION,
  V2_REGISTRATION_HEADERS,
} from "../src/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "../src/infrastructure/google/sheets-client";
import { createAdminSheetsClient } from "./_google-admin";

const V2_ADDED_REGISTRATION_HEADERS = ["BIRTH_DATE", "AGE_AT_SUBMISSION"] as const;
const V3_ADDED_OFFERING_HEADERS = [
  "PUBLIC_DESCRIPTION",
  "REGISTRATION_MODE",
  "INTAKE_STATE",
  "REGISTRATION_OPEN_FROM",
  "REGISTRATION_OPEN_TO",
  "WAITLIST_ENABLED",
] as const;
const V3_ADDED_REGISTRATION_HEADERS = [
  "SEASON_ID",
  "SEASON_NAME_SNAPSHOT",
  "ASSIGNED_GROUP_ID",
  "CONTACTED_AT",
  "CONFIRMED_AT",
  "POSSIBLE_DUPLICATE_OF",
] as const;

type MigrationHeaderState = "legacy" | "migrated";

function headerState(
  headerRow: readonly unknown[],
  addedHeaders: readonly string[],
  label: string,
): MigrationHeaderState {
  const existing = new Set(headerRow.map((value) => String(value ?? "").trim()).filter(Boolean));
  const presentCount = addedHeaders.filter((header) => existing.has(header)).length;

  if (presentCount === 0) {
    return "legacy";
  }

  if (presentCount === addedHeaders.length) {
    return "migrated";
  }

  throw new Error(
    `${label} has a partially applied migration (${presentCount}/${addedHeaders.length} v3 headers present). Refusing to insert columns again. Restore the TEST backup or repair the headers explicitly.`,
  );
}

function headerCells(headers: readonly string[]) {
  return [
    {
      values: headers.map((header) => ({ userEnteredValue: { stringValue: header } })),
    },
  ];
}

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
  const headerRow = registrationHeaderRows[0] ?? [];
  const state = headerState(headerRow, V2_ADDED_REGISTRATION_HEADERS, "ZAPISY v1 -> v2");

  if (state === "legacy") {
    createHeaderMap(headerRow, LEGACY_REGISTRATION_HEADERS);

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
      {
        updateCells: {
          start: {
            sheetId: registrationsSheet.sheetId,
            rowIndex: 0,
            columnIndex: 9,
          },
          rows: headerCells(V2_ADDED_REGISTRATION_HEADERS),
          fields: "userEnteredValue",
        },
      },
    ]);
  } else {
    createHeaderMap(headerRow, V2_REGISTRATION_HEADERS);
  }

  await setSystemSchemaVersion(client, 2);
  console.info("Migrated sheet schema from version 1 to 2.");
}

async function ensureV3OfferingDefaults(client: SheetsClient): Promise<void> {
  const offeringRows = await client.getValues(`${SHEET.offerings}!A:ZZ`);
  const headerRow = offeringRows[0] ?? [];
  const headers = createHeaderMap(headerRow, SHEET_SCHEMA[SHEET.offerings]);

  for (const [offset, row] of offeringRows.slice(1).entries()) {
    if (!row.some((value) => String(value ?? "").trim().length > 0)) {
      continue;
    }

    const rowNumber = offset + 2;
    const registrationMode = cell(row, headers, "REGISTRATION_MODE") || "ROLLING";
    const intakeState = cell(row, headers, "INTAKE_STATE") || "CLOSED";
    const openFrom = cell(row, headers, "REGISTRATION_OPEN_FROM");
    const openTo = cell(row, headers, "REGISTRATION_OPEN_TO");
    const waitlistEnabled = cell(row, headers, "WAITLIST_ENABLED") || "FALSE";

    await client.updateValues(`${SHEET.offerings}!G${rowNumber}:K${rowNumber}`, [
      [registrationMode, intakeState, openFrom, openTo, waitlistEnabled],
    ]);
  }
}

async function migrateV2ToV3(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const registrationsSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  const offeringsSheet = metadata.find((sheet) => sheet.title === SHEET.offerings);

  if (!registrationsSheet || !offeringsSheet) {
    throw new Error("Missing OFERTY_ZAJEC or ZAPISY sheet.");
  }

  const [registrationHeaderRows, offeringHeaderRows] = await Promise.all([
    client.getValues(`${SHEET.registrations}!1:1`),
    client.getValues(`${SHEET.offerings}!1:1`),
  ]);

  const registrationHeader = registrationHeaderRows[0] ?? [];
  const offeringHeader = offeringHeaderRows[0] ?? [];

  createHeaderMap(registrationHeader, V2_REGISTRATION_HEADERS);
  createHeaderMap(offeringHeader, LEGACY_OFFERING_HEADERS);

  const registrationState = headerState(
    registrationHeader,
    V3_ADDED_REGISTRATION_HEADERS,
    "ZAPISY v2 -> v3",
  );
  const offeringState = headerState(
    offeringHeader,
    V3_ADDED_OFFERING_HEADERS,
    "OFERTY_ZAJEC v2 -> v3",
  );

  if (registrationState !== offeringState) {
    throw new Error(
      "Schema v3 is only partially applied between OFERTY_ZAJEC and ZAPISY. Refusing to guess a recovery path. Restore the TEST backup or repair the structure explicitly.",
    );
  }

  if (registrationState === "legacy") {
    // Google Sheets batchUpdate applies this structure change as one validated batch:
    // insert columns first, then write their headers in the resulting coordinates.
    // A rerun can therefore distinguish legacy from fully migrated structure and
    // will never blindly insert the same v3 columns twice.
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
      {
        updateCells: {
          start: {
            sheetId: offeringsSheet.sheetId,
            rowIndex: 0,
            columnIndex: 3,
          },
          rows: headerCells([
            "PUBLIC_DESCRIPTION",
            "ACTIVE",
            "SORT_ORDER",
            "REGISTRATION_MODE",
            "INTAKE_STATE",
            "REGISTRATION_OPEN_FROM",
            "REGISTRATION_OPEN_TO",
            "WAITLIST_ENABLED",
          ]),
          fields: "userEnteredValue",
        },
      },
      {
        updateCells: {
          start: {
            sheetId: registrationsSheet.sheetId,
            rowIndex: 0,
            columnIndex: 21,
          },
          rows: headerCells(V3_ADDED_REGISTRATION_HEADERS),
          fields: "userEnteredValue",
        },
      },
    ]);
  }

  await ensureV3OfferingDefaults(client);

  // Structural bootstrap (new sheets, required settings, protections and the
  // native table contract) must succeed before the sheet advertises schema v3.
  // If it fails, SYSTEM_SCHEMA_VERSION stays at 2 and a later run sees the
  // already-migrated headers instead of inserting the columns again.
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
