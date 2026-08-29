import {
  POZYTYWKA_CITIES_2026_2027,
  POZYTYWKA_OFFERINGS_2026_2027,
  POZYTYWKA_SEASON_2026_2027,
  pozytywkaGroupsForSeason2026_2027,
  type CatalogRow,
} from "../src/config/pozytywka-offer-2026-2027";
import { buildRowByHeaders, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  CITY_HEADERS,
  GROUP_HEADERS,
  OFFERING_HEADERS,
  SEASON_HEADERS,
  SETTINGS_HEADERS,
  SHEET,
  SETTING_KEY,
  SYSTEM_SCHEMA_VERSION,
} from "../src/infrastructure/google/sheets-contracts";
import { bootstrapSheetStructure } from "../src/infrastructure/google/sheet-admin";
import type { SheetsClient } from "../src/infrastructure/google/sheets-client";
import { getServerEnv } from "../src/lib/env";
import { createAdminSheetsClient } from "./_google-admin";

const PRODUCTION_SPREADSHEET_ID = "1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM";

async function appendMappedRows(
  client: SheetsClient,
  sheetName: string,
  requiredHeaders: readonly string[],
  rows: readonly CatalogRow[],
): Promise<void> {
  const headerRows = await client.getValues(`${sheetName}!1:1`);
  const headerRow = headerRows[0] ?? [];
  createHeaderMap(headerRow, requiredHeaders);

  await client.appendValues(
    `${sheetName}!A:ZZ`,
    rows.map((row) => buildRowByHeaders(headerRow, row)),
  );
}

async function assertSafeInitialSeed(client: SheetsClient): Promise<void> {
  const existingRegistrationIds = await client.getValues(`${SHEET.registrations}!A2:A`);
  if (existingRegistrationIds.some((row) => String(row[0] ?? "").trim().length > 0)) {
    throw new Error(
      "Refusing production catalog seed because ZAPISY already contains registrations. Use catalog:refresh:2026-2027 instead.",
    );
  }
}

async function main() {
  const env = getServerEnv();

  if (env.APP_ENV !== "production") {
    throw new Error("Refusing production catalog seed. APP_ENV must be production.");
  }

  if (process.env.ALLOW_PRODUCTION_CATALOG_SEED !== "true") {
    throw new Error(
      "Refusing production catalog seed. Require ALLOW_PRODUCTION_CATALOG_SEED=true.",
    );
  }

  if (env.GOOGLE_SPREADSHEET_ID !== PRODUCTION_SPREADSHEET_ID) {
    throw new Error("Refusing production catalog seed for an unexpected spreadsheet ID.");
  }

  const client = createAdminSheetsClient();
  await bootstrapSheetStructure(client);
  await assertSafeInitialSeed(client);

  await client.clearValues(`${SHEET.cities}!A2:ZZ`);
  await client.clearValues(`${SHEET.seasons}!A2:ZZ`);
  await client.clearValues(`${SHEET.offerings}!A2:ZZ`);
  await client.clearValues(`${SHEET.groups}!A2:ZZ`);
  await client.clearValues(`${SHEET.settings}!A2:ZZ`);

  await appendMappedRows(client, SHEET.cities, CITY_HEADERS, POZYTYWKA_CITIES_2026_2027);
  await appendMappedRows(client, SHEET.seasons, SEASON_HEADERS, [POZYTYWKA_SEASON_2026_2027]);
  await appendMappedRows(client, SHEET.offerings, OFFERING_HEADERS, POZYTYWKA_OFFERINGS_2026_2027);
  await appendMappedRows(
    client,
    SHEET.groups,
    GROUP_HEADERS,
    pozytywkaGroupsForSeason2026_2027(POZYTYWKA_SEASON_2026_2027.SEASON_ID),
  );

  await appendMappedRows(client, SHEET.settings, SETTINGS_HEADERS, [
    { KEY: SETTING_KEY.systemSchemaVersion, VALUE: SYSTEM_SCHEMA_VERSION },
    { KEY: SETTING_KEY.registrationsOpen, VALUE: "NIE" },
    { KEY: SETTING_KEY.currentSeasonId, VALUE: POZYTYWKA_SEASON_2026_2027.SEASON_ID },
    { KEY: SETTING_KEY.publicFormTitle, VALUE: "Zapisy na zajęcia 2026/2027" },
    {
      KEY: SETTING_KEY.successMessage,
      VALUE: "Dziękujemy. Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się po jego weryfikacji.",
    },
    { KEY: SETTING_KEY.privacyNoticeUrl, VALUE: "/polityka-prywatnosci" },
    { KEY: SETTING_KEY.privacyNoticeVersion, VALUE: "2026-08-20" },
  ]);

  console.info(
    "Initial Pozytywka 2026/2027 production catalog seeded with 3 locations and 18 offerings. Registrations remain closed.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown production seed error.");
  process.exitCode = 1;
});
