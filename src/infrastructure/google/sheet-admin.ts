import type { City, ClassOffering } from "@/domain/catalog";
import { DEFAULT_FORM_TITLE, DEFAULT_SUCCESS_MESSAGE } from "@/domain/settings";
import {
  SheetSchemaError,
  buildRowByHeaders,
  cell,
  createHeaderMap,
} from "@/infrastructure/google/header-map";
import {
  assertUniqueIds,
  parseCityRow,
  parseOfferingRow,
} from "@/infrastructure/google/parsers";
import {
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SHEET_SCHEMA,
  SYSTEM_SCHEMA_VERSION,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetMetadata, SheetsClient } from "@/infrastructure/google/sheets-client";

export type SheetValidationReport = Readonly<{
  sheets: readonly string[];
  cityCount: number;
  offeringCount: number;
  warnings: readonly string[];
}>;

const DEFAULT_SETTINGS = [
  [SETTING_KEY.systemSchemaVersion, String(SYSTEM_SCHEMA_VERSION)],
  [SETTING_KEY.registrationsOpen, "NIE"],
  [SETTING_KEY.publicFormTitle, DEFAULT_FORM_TITLE],
  [SETTING_KEY.successMessage, DEFAULT_SUCCESS_MESSAGE],
  [SETTING_KEY.privacyNoticeUrl, ""],
  [SETTING_KEY.privacyNoticeVersion, ""],
] as const;

const REQUIRED_SETTING_KEYS = DEFAULT_SETTINGS.map(([key]) => key);
const VALID_ACTIVE_VALUES = new Set(["TAK", "NIE", "TRUE", "FALSE", "1", "0", "YES", "NO"]);

const REGISTRATION_PROTECTION_SPECS = [
  {
    description: "activity-registration:system-columns:identity-and-pii",
    startColumnIndex: 0,
    endColumnIndex: 14,
  },
  {
    description: "activity-registration:system-columns:metadata",
    startColumnIndex: 16,
    endColumnIndex: 21,
  },
] as const;

function rowHasContent(row: readonly unknown[]): boolean {
  return row.some((value) => String(value ?? "").trim().length > 0);
}

function warnAboutCatalogControls(
  row: readonly unknown[],
  rowNumber: number,
  headers: ReadonlyMap<string, number>,
  label: string,
  warnings: string[],
): void {
  if (!rowHasContent(row)) {
    return;
  }

  const active = cell(row, headers, "ACTIVE").toUpperCase();
  if (!VALID_ACTIVE_VALUES.has(active)) {
    warnings.push(
      `${label} row ${rowNumber} has invalid ACTIVE value and will be treated as inactive.`,
    );
  }

  const sortOrder = cell(row, headers, "SORT_ORDER");
  if (sortOrder && !Number.isFinite(Number(sortOrder))) {
    warnings.push(`${label} row ${rowNumber} has invalid SORT_ORDER and will use 0.`);
  }
}

async function ensureDefaultSettings(client: SheetsClient): Promise<void> {
  const settingsRows = await client.getValues(`${SHEET.settings}!A:ZZ`);
  const headerRow = settingsRows[0] ?? [];
  const headers = createHeaderMap(headerRow, SETTINGS_HEADERS);
  const existingKeys = new Set<string>();

  for (const row of settingsRows.slice(1)) {
    const key = cell(row, headers, "KEY");
    if (!key) {
      continue;
    }

    if (existingKeys.has(key)) {
      throw new SheetSchemaError(`Duplicate setting key: ${key}`);
    }

    existingKeys.add(key);
  }

  const missingRows = DEFAULT_SETTINGS.filter(([key]) => !existingKeys.has(key)).map(
    ([key, value]) => buildRowByHeaders(headerRow, { KEY: key, VALUE: value }),
  );

  if (missingRows.length > 0) {
    await client.appendValues(`${SHEET.settings}!A:ZZ`, missingRows);
  }
}

async function ensureRegistrationProtections(
  client: SheetsClient,
  metadata: readonly SheetMetadata[],
): Promise<void> {
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  if (!registrationSheet) {
    return;
  }

  const existingDescriptions = new Set(
    (registrationSheet.protectedRanges ?? []).map((range) => range.description),
  );
  const requests = REGISTRATION_PROTECTION_SPECS.filter(
    (spec) => !existingDescriptions.has(spec.description),
  ).map((spec) => ({
    addProtectedRange: {
      protectedRange: {
        description: spec.description,
        warningOnly: true,
        range: {
          sheetId: registrationSheet.sheetId,
          startColumnIndex: spec.startColumnIndex,
          endColumnIndex: spec.endColumnIndex,
        },
      },
    },
  }));

  if (requests.length > 0) {
    await client.batchUpdate(requests);
  }
}

function warnAboutRegistrationProtections(
  metadata: readonly SheetMetadata[],
  warnings: string[],
): void {
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  if (!registrationSheet) {
    return;
  }

  for (const spec of REGISTRATION_PROTECTION_SPECS) {
    const protection = (registrationSheet.protectedRanges ?? []).find(
      (candidate) => candidate.description === spec.description,
    );

    if (!protection) {
      warnings.push(`ZAPISY protection is missing: ${spec.description}. Run sheet:bootstrap.`);
      continue;
    }

    if (
      !protection.warningOnly ||
      protection.startColumnIndex !== spec.startColumnIndex ||
      protection.endColumnIndex !== spec.endColumnIndex
    ) {
      warnings.push(`ZAPISY protection is inconsistent: ${spec.description}. Run sheet:bootstrap.`);
    }
  }
}

export async function bootstrapSheetStructure(client: SheetsClient): Promise<void> {
  let metadata = await client.getSheetMetadata();
  const existing = new Set(metadata.map((sheet) => sheet.title));

  for (const title of Object.keys(SHEET_SCHEMA)) {
    if (!existing.has(title)) {
      await client.batchUpdate([{ addSheet: { properties: { title } } }]);
    }
  }

  metadata = await client.getSheetMetadata();

  for (const [title, requiredHeaders] of Object.entries(SHEET_SCHEMA)) {
    const rows = await client.getValues(`${title}!1:1`);
    const currentHeader = rows[0] ?? [];

    if (currentHeader.length === 0) {
      await client.updateValues(`${title}!1:1`, [requiredHeaders]);
    } else {
      createHeaderMap(currentHeader, requiredHeaders);
    }

    const sheet = metadata.find((item) => item.title === title);
    if (sheet) {
      await client.batchUpdate([
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheet.sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ]);
    }
  }

  await ensureDefaultSettings(client);
  await ensureRegistrationProtections(client, metadata);
}

export async function validateSheetStructure(client: SheetsClient): Promise<SheetValidationReport> {
  const metadata = await client.getSheetMetadata();
  const titles = metadata.map((sheet) => sheet.title);
  const missingSheets = Object.keys(SHEET_SCHEMA).filter((title) => !titles.includes(title));

  if (missingSheets.length > 0) {
    throw new SheetSchemaError(`Missing sheets: ${missingSheets.join(", ")}`);
  }

  for (const [title, requiredHeaders] of Object.entries(SHEET_SCHEMA)) {
    const headerRows = await client.getValues(`${title}!1:1`);
    createHeaderMap(headerRows[0] ?? [], requiredHeaders);
  }

  const [cityRows, offeringRows, settingsRows] = await Promise.all([
    client.getValues(`${SHEET.cities}!A:ZZ`),
    client.getValues(`${SHEET.offerings}!A:ZZ`),
    client.getValues(`${SHEET.settings}!A:ZZ`),
  ]);

  const cityHeaders = createHeaderMap(cityRows[0] ?? [], SHEET_SCHEMA[SHEET.cities]);
  const offeringHeaders = createHeaderMap(offeringRows[0] ?? [], SHEET_SCHEMA[SHEET.offerings]);
  const settingsHeaders = createHeaderMap(settingsRows[0] ?? [], SHEET_SCHEMA[SHEET.settings]);

  const warnings: string[] = [];
  const cities: City[] = [];
  const offerings: ClassOffering[] = [];

  warnAboutRegistrationProtections(metadata, warnings);

  for (const [offset, row] of cityRows.slice(1).entries()) {
    const rowNumber = offset + 2;
    const parsed = parseCityRow(row, cityHeaders);

    warnAboutCatalogControls(row, rowNumber, cityHeaders, "MIASTA", warnings);

    if (parsed) {
      cities.push(parsed);
    } else if (rowHasContent(row)) {
      warnings.push(
        `MIASTA row ${rowNumber} is incomplete or has an invalid technical ID and will be ignored.`,
      );
    }
  }

  for (const [offset, row] of offeringRows.slice(1).entries()) {
    const rowNumber = offset + 2;
    const parsed = parseOfferingRow(row, offeringHeaders);

    warnAboutCatalogControls(row, rowNumber, offeringHeaders, "OFERTY_ZAJEC", warnings);

    if (parsed) {
      offerings.push(parsed);
    } else if (rowHasContent(row)) {
      warnings.push(
        `OFERTY_ZAJEC row ${rowNumber} is incomplete or has an invalid technical ID and will be ignored.`,
      );
    }
  }

  assertUniqueIds(cities, "city");
  assertUniqueIds(offerings, "offering");

  const cityIds = new Set(cities.map((city) => city.id));

  for (const offering of offerings) {
    if (!cityIds.has(offering.cityId)) {
      warnings.push(`Offering ${offering.id} references unknown city ${offering.cityId}.`);
    }
  }

  const settingKeys = new Set<string>();
  const settingValues = new Map<string, string>();
  for (const row of settingsRows.slice(1)) {
    const key = cell(row, settingsHeaders, "KEY");
    if (!key) {
      continue;
    }

    if (settingKeys.has(key)) {
      throw new SheetSchemaError(`Duplicate setting key: ${key}`);
    }
    settingKeys.add(key);
    settingValues.set(key, cell(row, settingsHeaders, "VALUE"));
  }

  const systemSchemaVersion = (settingValues.get(SETTING_KEY.systemSchemaVersion) ?? "").trim();
  if (systemSchemaVersion !== String(SYSTEM_SCHEMA_VERSION)) {
    throw new SheetSchemaError(
      `Unsupported SYSTEM_SCHEMA_VERSION: ${systemSchemaVersion || "<empty>"}`,
    );
  }

  const registrationsOpen = (settingValues.get(SETTING_KEY.registrationsOpen) ?? "")
    .trim()
    .toUpperCase();
  if (!VALID_ACTIVE_VALUES.has(registrationsOpen)) {
    warnings.push(
      `USTAWIENIA ${SETTING_KEY.registrationsOpen} has an invalid boolean value and runtime will fail closed.`,
    );
  }

  const privacyUrl = (settingValues.get(SETTING_KEY.privacyNoticeUrl) ?? "").trim();
  const privacyVersion = (settingValues.get(SETTING_KEY.privacyNoticeVersion) ?? "").trim();
  if (Boolean(privacyUrl) !== Boolean(privacyVersion)) {
    warnings.push(
      "USTAWIENIA privacy notice URL and version should either both be set or both be empty.",
    );
  }

  const missingSettingKeys = REQUIRED_SETTING_KEYS.filter((key) => !settingKeys.has(key));
  if (missingSettingKeys.length > 0) {
    throw new SheetSchemaError(`Missing required setting keys: ${missingSettingKeys.join(", ")}`);
  }

  return {
    sheets: titles,
    cityCount: cities.length,
    offeringCount: offerings.length,
    warnings,
  };
}
