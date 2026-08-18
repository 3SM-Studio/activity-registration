import { buildRowByHeaders, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  CITY_HEADERS,
  OFFERING_HEADERS,
  SETTINGS_HEADERS,
  SHEET,
  SETTING_KEY,
  SYSTEM_SCHEMA_VERSION,
} from "../src/infrastructure/google/sheets-contracts";
import { bootstrapSheetStructure } from "../src/infrastructure/google/sheet-admin";
import type { SheetsClient } from "../src/infrastructure/google/sheets-client";
import { getServerEnv } from "../src/lib/env";
import { createAdminSheetsClient } from "./_google-admin";

async function appendMappedRows(
  client: SheetsClient,
  sheetName: string,
  requiredHeaders: readonly string[],
  rows: readonly Readonly<Record<string, string | number>>[],
): Promise<void> {
  const headerRows = await client.getValues(`${sheetName}!1:1`);
  const headerRow = headerRows[0] ?? [];
  createHeaderMap(headerRow, requiredHeaders);

  await client.appendValues(
    `${sheetName}!A:ZZ`,
    rows.map((row) => buildRowByHeaders(headerRow, row)),
  );
}

async function main() {
  const env = getServerEnv();

  if (env.APP_ENV !== "test" || env.ALLOW_TEST_SEED !== "true") {
    throw new Error("Refusing to seed. Require APP_ENV=test and ALLOW_TEST_SEED=true.");
  }

  const client = createAdminSheetsClient();
  await bootstrapSheetStructure(client);

  await client.clearValues(`${SHEET.cities}!A2:ZZ`);
  await client.clearValues(`${SHEET.offerings}!A2:ZZ`);
  await client.clearValues(`${SHEET.settings}!A2:ZZ`);

  await appendMappedRows(client, SHEET.cities, CITY_HEADERS, [
    { CITY_ID: "gdynia", NAME: "Gdynia", ACTIVE: "TAK", SORT_ORDER: 10 },
    { CITY_ID: "sopot", NAME: "Sopot", ACTIVE: "TAK", SORT_ORDER: 20 },
  ]);

  await appendMappedRows(client, SHEET.offerings, OFFERING_HEADERS, [
    {
      OFFERING_ID: "gdynia-hiphop",
      CITY_ID: "gdynia",
      NAME: "Hip-hop",
      ACTIVE: "TAK",
      SORT_ORDER: 10,
    },
    {
      OFFERING_ID: "gdynia-contemporary",
      CITY_ID: "gdynia",
      NAME: "Contemporary",
      ACTIVE: "TAK",
      SORT_ORDER: 20,
    },
    {
      OFFERING_ID: "gdynia-taniec-wspolczesny",
      CITY_ID: "gdynia",
      NAME: "Taniec współczesny",
      ACTIVE: "TAK",
      SORT_ORDER: 30,
    },
    {
      OFFERING_ID: "sopot-hiphop",
      CITY_ID: "sopot",
      NAME: "Hip-hop",
      ACTIVE: "TAK",
      SORT_ORDER: 10,
    },
    {
      OFFERING_ID: "sopot-choreografia",
      CITY_ID: "sopot",
      NAME: "Choreografia",
      ACTIVE: "TAK",
      SORT_ORDER: 20,
    },
  ]);

  await appendMappedRows(client, SHEET.settings, SETTINGS_HEADERS, [
    { KEY: SETTING_KEY.systemSchemaVersion, VALUE: SYSTEM_SCHEMA_VERSION },
    { KEY: SETTING_KEY.registrationsOpen, VALUE: "TAK" },
    { KEY: SETTING_KEY.publicFormTitle, VALUE: "Zapisy na zajęcia" },
    {
      KEY: SETTING_KEY.successMessage,
      VALUE: "Dziękujemy. Zgłoszenie zostało wysłane.",
    },
    { KEY: SETTING_KEY.privacyNoticeUrl, VALUE: "/polityka-prywatnosci" },
    { KEY: SETTING_KEY.privacyNoticeVersion, VALUE: "test-v1" },
  ]);

  console.info("Synthetic TEST catalog seeded. Registration rows were not touched.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown seed error.");
  process.exitCode = 1;
});
