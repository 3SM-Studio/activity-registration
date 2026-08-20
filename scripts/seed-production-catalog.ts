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
const CURRENT_SEASON_ID = "2026-2027";

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

async function assertSafeInitialSeed(client: SheetsClient): Promise<void> {
  const existingRegistrationIds = await client.getValues(`${SHEET.registrations}!A2:A`);
  if (existingRegistrationIds.some((row) => String(row[0] ?? "").trim().length > 0)) {
    throw new Error("Refusing production catalog seed because ZAPISY already contains registrations.");
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

  await appendMappedRows(client, SHEET.cities, CITY_HEADERS, [
    { CITY_ID: "olkusz", NAME: "Olkusz", ACTIVE: "TAK", SORT_ORDER: 10 },
  ]);

  await appendMappedRows(client, SHEET.seasons, SEASON_HEADERS, [
    {
      SEASON_ID: CURRENT_SEASON_ID,
      NAME: "2026/2027",
      START_DATE: "2026-09-01",
      END_DATE: "2027-07-31",
      ACTIVE: "TAK",
      SORT_ORDER: 10,
    },
  ]);

  await appendMappedRows(client, SHEET.offerings, OFFERING_HEADERS, [
    {
      OFFERING_ID: "olkusz-wokalno-taneczne",
      CITY_ID: "olkusz",
      NAME: "Zajęcia wokalno-taneczne",
      PUBLIC_DESCRIPTION:
        "Śpiew, ruch sceniczny i choreografia w grupach dopasowanych do wieku uczestników.",
      ACTIVE: "TAK",
      SORT_ORDER: 10,
      REGISTRATION_MODE: "ROLLING",
      INTAKE_STATE: "OPEN",
      REGISTRATION_OPEN_FROM: "",
      REGISTRATION_OPEN_TO: "",
      WAITLIST_ENABLED: "TRUE",
    },
    {
      OFFERING_ID: "olkusz-wokal",
      CITY_ID: "olkusz",
      NAME: "Wokal",
      PUBLIC_DESCRIPTION:
        "Zajęcia rozwijające emisję głosu, interpretację i swobodę sceniczną.",
      ACTIVE: "TAK",
      SORT_ORDER: 20,
      REGISTRATION_MODE: "ROLLING",
      INTAKE_STATE: "OPEN",
      REGISTRATION_OPEN_FROM: "",
      REGISTRATION_OPEN_TO: "",
      WAITLIST_ENABLED: "TRUE",
    },
    {
      OFFERING_ID: "olkusz-teatr-dzieciecy",
      CITY_ID: "olkusz",
      NAME: "Teatr dziecięcy",
      PUBLIC_DESCRIPTION:
        "Zajęcia teatralne dla dzieci, praca z tekstem, ruchem, wyobraźnią i zespołem.",
      ACTIVE: "TAK",
      SORT_ORDER: 30,
      REGISTRATION_MODE: "ROLLING",
      INTAKE_STATE: "OPEN",
      REGISTRATION_OPEN_FROM: "",
      REGISTRATION_OPEN_TO: "",
      WAITLIST_ENABLED: "TRUE",
    },
    {
      OFFERING_ID: "olkusz-teatr-muzyczny",
      CITY_ID: "olkusz",
      NAME: "Teatr muzyczny",
      PUBLIC_DESCRIPTION:
        "Praca nad spektaklem łączącym aktorstwo, śpiew i ruch sceniczny. Przyjęcie do konkretnego zespołu potwierdza Pozytywka po kontakcie.",
      ACTIVE: "TAK",
      SORT_ORDER: 40,
      REGISTRATION_MODE: "WINDOWED",
      INTAKE_STATE: "OPEN",
      REGISTRATION_OPEN_FROM: "2026-08-01",
      REGISTRATION_OPEN_TO: "2026-09-15",
      WAITLIST_ENABLED: "TRUE",
    },
    {
      OFFERING_ID: "olkusz-balet",
      CITY_ID: "olkusz",
      NAME: "Balet",
      PUBLIC_DESCRIPTION:
        "Podstawy tańca klasycznego, koordynacji, muzykalności i pracy z ruchem.",
      ACTIVE: "TAK",
      SORT_ORDER: 50,
      REGISTRATION_MODE: "ROLLING",
      INTAKE_STATE: "OPEN",
      REGISTRATION_OPEN_FROM: "",
      REGISTRATION_OPEN_TO: "",
      WAITLIST_ENABLED: "TRUE",
    },
    {
      OFFERING_ID: "olkusz-taniec-akrobatyka",
      CITY_ID: "olkusz",
      NAME: "Taniec i akrobatyka",
      PUBLIC_DESCRIPTION:
        "Zajęcia łączące choreografię, sprawność, koordynację i elementy akrobatyczne.",
      ACTIVE: "TAK",
      SORT_ORDER: 60,
      REGISTRATION_MODE: "ROLLING",
      INTAKE_STATE: "OPEN",
      REGISTRATION_OPEN_FROM: "",
      REGISTRATION_OPEN_TO: "",
      WAITLIST_ENABLED: "TRUE",
    },
  ]);

  await appendMappedRows(client, SHEET.groups, GROUP_HEADERS, [
    {
      GROUP_ID: "olkusz-psikusy",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-wokalno-taneczne",
      NAME: "PSIKUSY",
      AGE_MIN: 3,
      AGE_MAX: 6,
      DAY_OF_WEEK: "Poniedziałek",
      START_TIME: "16:00",
      END_TIME: "17:00",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Iwona Pilarz",
      CAPACITY: 14,
      ACTIVE: "TAK",
      SORT_ORDER: 10,
    },
    {
      GROUP_ID: "olkusz-psotki",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-wokalno-taneczne",
      NAME: "PSOTKI",
      AGE_MIN: 7,
      AGE_MAX: 9,
      DAY_OF_WEEK: "Wtorek",
      START_TIME: "16:00",
      END_TIME: "17:15",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Iwona Pilarz",
      CAPACITY: 16,
      ACTIVE: "TAK",
      SORT_ORDER: 20,
    },
    {
      GROUP_ID: "olkusz-pozytywki",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-wokalno-taneczne",
      NAME: "POZYTYWKI",
      AGE_MIN: 10,
      AGE_MAX: 12,
      DAY_OF_WEEK: "Środa",
      START_TIME: "16:30",
      END_TIME: "18:00",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Patrycja Tomczyk",
      CAPACITY: 18,
      ACTIVE: "TAK",
      SORT_ORDER: 30,
    },
    {
      GROUP_ID: "olkusz-besti",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-wokal",
      NAME: "BESTI",
      AGE_MIN: 13,
      AGE_MAX: 18,
      DAY_OF_WEEK: "Czwartek",
      START_TIME: "17:00",
      END_TIME: "18:30",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Weronika Sapronczyk",
      CAPACITY: 18,
      ACTIVE: "TAK",
      SORT_ORDER: 40,
    },
    {
      GROUP_ID: "olkusz-bez-kurtyny",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-teatr-dzieciecy",
      NAME: "BEZ KURTYNY",
      AGE_MIN: 8,
      AGE_MAX: 12,
      DAY_OF_WEEK: "Piątek",
      START_TIME: "16:30",
      END_TIME: "18:00",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Iwona Pilarz",
      CAPACITY: 18,
      ACTIVE: "TAK",
      SORT_ORDER: 50,
    },
    {
      GROUP_ID: "olkusz-od-poczatku",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-teatr-muzyczny",
      NAME: "OD POCZĄTKU",
      AGE_MIN: 13,
      AGE_MAX: 19,
      DAY_OF_WEEK: "Sobota",
      START_TIME: "10:00",
      END_TIME: "13:00",
      LOCATION: "Olkusz - sala prób Pozytywki",
      INSTRUCTOR: "Iwona Pilarz",
      CAPACITY: 36,
      ACTIVE: "TAK",
      SORT_ORDER: 60,
    },
    {
      GROUP_ID: "olkusz-balet-mlodszy",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-balet",
      NAME: "Szkółka baletu",
      AGE_MIN: 5,
      AGE_MAX: 8,
      DAY_OF_WEEK: "Poniedziałek",
      START_TIME: "17:15",
      END_TIME: "18:15",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Iwona Pilarz",
      CAPACITY: 14,
      ACTIVE: "TAK",
      SORT_ORDER: 70,
    },
    {
      GROUP_ID: "olkusz-inside",
      SEASON_ID: CURRENT_SEASON_ID,
      OFFERING_ID: "olkusz-taniec-akrobatyka",
      NAME: "INSIDE",
      AGE_MIN: 8,
      AGE_MAX: 14,
      DAY_OF_WEEK: "Środa",
      START_TIME: "18:15",
      END_TIME: "19:30",
      LOCATION: "Olkusz - sala zajęciowa Pozytywki",
      INSTRUCTOR: "Oleg Sapronczyk",
      CAPACITY: 18,
      ACTIVE: "TAK",
      SORT_ORDER: 80,
    },
  ]);

  await appendMappedRows(client, SHEET.settings, SETTINGS_HEADERS, [
    { KEY: SETTING_KEY.systemSchemaVersion, VALUE: SYSTEM_SCHEMA_VERSION },
    { KEY: SETTING_KEY.registrationsOpen, VALUE: "NIE" },
    { KEY: SETTING_KEY.currentSeasonId, VALUE: CURRENT_SEASON_ID },
    { KEY: SETTING_KEY.publicFormTitle, VALUE: "Zapisy na zajęcia 2026/2027" },
    {
      KEY: SETTING_KEY.successMessage,
      VALUE:
        "Dziękujemy. Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się po jego weryfikacji.",
    },
    { KEY: SETTING_KEY.privacyNoticeUrl, VALUE: "/polityka-prywatnosci" },
    { KEY: SETTING_KEY.privacyNoticeVersion, VALUE: "2026-08-20" },
  ]);

  console.info(
    "Initial Pozytywka production catalog seeded with registrations closed. ZAPISY remained empty.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown production seed error.");
  process.exitCode = 1;
});
