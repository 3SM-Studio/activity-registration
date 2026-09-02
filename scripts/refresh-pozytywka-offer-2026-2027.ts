import {
  POZYTYWKA_CITIES_2026_2027,
  POZYTYWKA_OFFERINGS_2026_2027,
  POZYTYWKA_SEASON_2026_2027,
  pozytywkaGroupsForSeason2026_2027,
  type CatalogRow,
} from "../src/config/pozytywka-offer-2026-2027";
import { buildRowByHeaders, cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  syncOperatorSheetSchema,
  validateSafeOperatorSheetExperience,
} from "../src/infrastructure/google/operator-sheet-runtime";
import { bootstrapSheetStructure } from "../src/infrastructure/google/sheet-admin";
import {
  bootstrapSupportingSheetTables,
  validateSupportingSheetTables,
} from "../src/infrastructure/google/supporting-sheet-tables";
import {
  CITY_HEADERS,
  GROUP_HEADERS,
  OFFERING_HEADERS,
  SETTINGS_HEADERS,
  SHEET,
  SETTING_KEY,
} from "../src/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "../src/infrastructure/google/sheets-client";
import { getServerEnv, PRODUCTION_SPREADSHEET_ID } from "../src/lib/env";
import { createAdminSheetsClient } from "./_google-admin";

type WritableCell = string | number | boolean;

function writableCell(value: unknown): WritableCell {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value ?? "");
}

function columnLabel(columnCount: number): string {
  if (!Number.isInteger(columnCount) || columnCount < 1) {
    throw new Error(`Invalid sheet column count: ${columnCount}.`);
  }

  let remaining = columnCount;
  let label = "";
  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }
  return label;
}

function requireSingleSetting(rows: readonly (readonly unknown[])[], key: string): string {
  const headerRow = rows[0] ?? [];
  const headers = createHeaderMap(headerRow, SETTINGS_HEADERS);
  const matches = rows.slice(1).filter((row) => cell(row, headers, "KEY") === key);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${key} setting, found ${matches.length}.`);
  }
  return cell(matches[0] ?? [], headers, "VALUE");
}

function settingsValueIsTrue(value: string): boolean {
  return ["TAK", "TRUE", "1", "YES"].includes(value.trim().toUpperCase());
}

async function rewriteCatalogSheet(
  client: SheetsClient,
  sheetName: string,
  requiredHeaders: readonly string[],
  idHeader: string,
  desiredRows: readonly CatalogRow[],
): Promise<void> {
  const existing = await client.getValues(`${sheetName}!A:ZZ`, {
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const headerRow = existing[0] ?? [];
  const headers = createHeaderMap(headerRow, requiredHeaders);
  const activeIndex = headers.get("ACTIVE");
  if (activeIndex === undefined) {
    throw new Error(`${sheetName} is missing ACTIVE.`);
  }

  const rowsById = new Map<string, WritableCell[]>();
  for (const row of existing.slice(1)) {
    const id = cell(row, headers, idHeader);
    if (!id) {
      continue;
    }
    if (rowsById.has(id)) {
      throw new Error(`Refusing catalog refresh because ${sheetName} contains duplicate ID ${id}.`);
    }
    const preserved = headerRow.map((_, index) => writableCell(row[index]));
    preserved[activeIndex] = "NIE";
    rowsById.set(id, preserved);
  }

  for (const desired of desiredRows) {
    const id = String(desired[idHeader] ?? "").trim();
    if (!id) {
      throw new Error(`Desired ${sheetName} row is missing ${idHeader}.`);
    }
    rowsById.set(id, [...buildRowByHeaders(headerRow, desired)]);
  }

  const desiredIds = new Set(desiredRows.map((row) => String(row[idHeader])));
  const ordered = [
    ...desiredRows.map((row) => rowsById.get(String(row[idHeader]))).filter(Boolean),
    ...[...rowsById.entries()]
      .filter(([id]) => !desiredIds.has(id))
      .sort(([left], [right]) => left.localeCompare(right, "pl"))
      .map(([, row]) => row),
  ] as WritableCell[][];

  await client.clearValues(`${sheetName}!A2:ZZ`);
  if (ordered.length > 0) {
    const endColumn = columnLabel(headerRow.length);
    const endRow = ordered.length + 1;
    await client.updateValues(`${sheetName}!A2:${endColumn}${endRow}`, ordered);
  }
}

async function main() {
  const env = getServerEnv();

  if (env.APP_ENV !== "test" && env.APP_ENV !== "production") {
    throw new Error("Catalog refresh requires APP_ENV=test or APP_ENV=production.");
  }

  if (process.env.ALLOW_POZYTYWKA_OFFER_REFRESH !== "true") {
    throw new Error("Refusing catalog refresh. Require ALLOW_POZYTYWKA_OFFER_REFRESH=true.");
  }

  if (env.APP_ENV === "production" && env.GOOGLE_SPREADSHEET_ID !== PRODUCTION_SPREADSHEET_ID) {
    throw new Error("Refusing production catalog refresh for an unexpected spreadsheet ID.");
  }

  const client = createAdminSheetsClient();
  const hardProtectionEditorEmails =
    env.APP_ENV === "production" && env.GCP_SERVICE_ACCOUNT_EMAIL
      ? [env.GCP_SERVICE_ACCOUNT_EMAIL]
      : undefined;

  await bootstrapSheetStructure(
    client,
    hardProtectionEditorEmails ? { hardProtectionEditorEmails } : {},
  );

  const settingsRows = await client.getValues(`${SHEET.settings}!A:ZZ`, {
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const registrationsOpen = requireSingleSetting(settingsRows, SETTING_KEY.registrationsOpen);
  if (settingsValueIsTrue(registrationsOpen)) {
    throw new Error("Refusing catalog refresh while REGISTRATIONS_OPEN is enabled.");
  }

  const currentSeasonId = requireSingleSetting(settingsRows, SETTING_KEY.currentSeasonId);
  if (!currentSeasonId) {
    throw new Error("Refusing catalog refresh without CURRENT_SEASON_ID.");
  }
  if (env.APP_ENV === "production" && currentSeasonId !== POZYTYWKA_SEASON_2026_2027.SEASON_ID) {
    throw new Error(
      `Refusing production catalog refresh for season ${currentSeasonId}; expected ${POZYTYWKA_SEASON_2026_2027.SEASON_ID}.`,
    );
  }

  const desiredGroups = pozytywkaGroupsForSeason2026_2027(currentSeasonId);

  await rewriteCatalogSheet(
    client,
    SHEET.cities,
    CITY_HEADERS,
    "CITY_ID",
    POZYTYWKA_CITIES_2026_2027,
  );
  await rewriteCatalogSheet(
    client,
    SHEET.offerings,
    OFFERING_HEADERS,
    "OFFERING_ID",
    POZYTYWKA_OFFERINGS_2026_2027,
  );
  await rewriteCatalogSheet(client, SHEET.groups, GROUP_HEADERS, "GROUP_ID", desiredGroups);

  // Catalog writes can change the populated row count and active group set. Restore
  // every structure that depends on those values before considering the refresh done.
  await bootstrapSupportingSheetTables(client);
  await syncOperatorSheetSchema(client);
  await validateSupportingSheetTables(client);
  await validateSafeOperatorSheetExperience(client);

  console.info(
    `Pozytywka offer refresh completed for ${env.APP_ENV}: ${POZYTYWKA_CITIES_2026_2027.length} active locations, ${POZYTYWKA_OFFERINGS_2026_2027.length} active offerings, ${desiredGroups.length} active groups. Existing catalog rows were preserved as inactive. Native table ranges, registration protections and the operator dashboard were synchronized. ZAPISY and POWIADOMIENIA were not modified.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown catalog refresh error.");
  process.exitCode = 1;
});