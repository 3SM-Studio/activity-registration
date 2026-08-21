import type { City, ClassOffering, InternalGroup, Season } from "@/domain/catalog";
import { REGISTRATION_STATUS } from "@/domain/registration";
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
  parseGroupRow,
  parseOfferingRow,
  parseSeasonRow,
} from "@/infrastructure/google/parsers";
import {
  REGISTRATION_HEADERS,
  REGISTRATION_TABLE_COLUMNS,
  REGISTRATIONS_TABLE_ID,
  REGISTRATIONS_TABLE_NAME,
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SHEET_SCHEMA,
  SYSTEM_SCHEMA_VERSION,
} from "@/infrastructure/google/sheets-contracts";
import type {
  SheetMetadata,
  SheetsClient,
  TableMetadata,
} from "@/infrastructure/google/sheets-client";

export type SheetValidationReport = Readonly<{
  sheets: readonly string[];
  cityCount: number;
  seasonCount: number;
  offeringCount: number;
  groupCount: number;
  warnings: readonly string[];
}>;

export type SheetBootstrapOptions = Readonly<{
  hardProtectionEditorEmails?: readonly string[];
}>;

const DEFAULT_SETTINGS = [
  [SETTING_KEY.systemSchemaVersion, String(SYSTEM_SCHEMA_VERSION)],
  [SETTING_KEY.registrationsOpen, "NIE"],
  [SETTING_KEY.currentSeasonId, ""],
  [SETTING_KEY.publicFormTitle, DEFAULT_FORM_TITLE],
  [SETTING_KEY.successMessage, DEFAULT_SUCCESS_MESSAGE],
  [SETTING_KEY.privacyNoticeUrl, ""],
  [SETTING_KEY.privacyNoticeVersion, ""],
] as const;

const REQUIRED_SETTING_KEYS = DEFAULT_SETTINGS.map(([key]) => key);
const VALID_ACTIVE_VALUES = new Set(["TAK", "NIE", "TRUE", "FALSE", "1", "0", "YES", "NO"]);

const REGISTRATION_PROTECTION_SPECS = [
  {
    description: "activity-registration:hard-system:core-identifiers",
    startColumnIndex: 0,
    endColumnIndex: 7,
  },
  {
    description: "activity-registration:hard-system:age-snapshot",
    startColumnIndex: 10,
    endColumnIndex: 11,
  },
  {
    description: "activity-registration:hard-system:submission-metadata",
    startColumnIndex: 17,
    endColumnIndex: 23,
  },
  {
    description: "activity-registration:hard-system:duplicate-and-schema",
    startColumnIndex: 27,
    endColumnIndex: 29,
  },
] as const;

const MANAGED_PROTECTION_PREFIXES = [
  "activity-registration:system-columns:",
  "activity-registration:hard-system:",
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

function managedProtection(description: string): boolean {
  return MANAGED_PROTECTION_PREFIXES.some((prefix) => description.startsWith(prefix));
}

async function ensureRegistrationProtections(
  client: SheetsClient,
  metadata: readonly SheetMetadata[],
  options: SheetBootstrapOptions,
): Promise<void> {
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  if (!registrationSheet) {
    return;
  }

  const editorEmails = [...(options.hardProtectionEditorEmails ?? [])];
  const useHardProtection = editorEmails.length > 0;
  const requests: Record<string, unknown>[] = [];

  for (const existing of registrationSheet.protectedRanges ?? []) {
    if (managedProtection(existing.description)) {
      requests.push({ deleteProtectedRange: { protectedRangeId: existing.protectedRangeId } });
    }
  }

  for (const spec of REGISTRATION_PROTECTION_SPECS) {
    requests.push({
      addProtectedRange: {
        protectedRange: {
          description: spec.description,
          warningOnly: !useHardProtection,
          ...(useHardProtection ? { editors: { users: editorEmails } } : {}),
          range: {
            sheetId: registrationSheet.sheetId,
            startColumnIndex: spec.startColumnIndex,
            endColumnIndex: spec.endColumnIndex,
          },
        },
      },
    });
  }

  requests.push({
    addProtectedRange: {
      protectedRange: {
        description: "activity-registration:hard-system:header",
        warningOnly: !useHardProtection,
        ...(useHardProtection ? { editors: { users: editorEmails } } : {}),
        range: {
          sheetId: registrationSheet.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: REGISTRATION_HEADERS.length,
        },
      },
    },
  });

  await client.batchUpdate(requests);
}

function registrationTableRange(sheetId: number, rowCount: number) {
  return {
    sheetId,
    startRowIndex: 0,
    endRowIndex: Math.max(rowCount, 2),
    startColumnIndex: 0,
    endColumnIndex: REGISTRATION_HEADERS.length,
  } as const;
}

const REGISTRATION_TABLE_ROWS_PROPERTIES = {
  headerColorStyle: { rgbColor: { red: 0.188, green: 0.122, blue: 0.188 } },
  firstBandColorStyle: { rgbColor: { red: 1, green: 0.988, blue: 0.969 } },
  secondBandColorStyle: { rgbColor: { red: 1, green: 0.973, blue: 0.949 } },
} as const;

async function ensureRegistrationTable(
  client: SheetsClient,
  metadata: readonly SheetMetadata[],
): Promise<void> {
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  if (!registrationSheet) {
    return;
  }

  const rows = await client.getValues(`${SHEET.registrations}!A:ZZ`);
  const table = (registrationSheet.tables ?? []).find(
    (candidate) => candidate.tableId === REGISTRATIONS_TABLE_ID,
  );

  const tableDefinition = {
    tableId: REGISTRATIONS_TABLE_ID,
    name: REGISTRATIONS_TABLE_NAME,
    range: registrationTableRange(registrationSheet.sheetId, rows.length),
    rowsProperties: REGISTRATION_TABLE_ROWS_PROPERTIES,
    columnProperties: REGISTRATION_TABLE_COLUMNS,
  } as const;

  if (!table) {
    const conflictingTable = (registrationSheet.tables ?? []).find(
      (candidate) => candidate.name === REGISTRATIONS_TABLE_NAME,
    );
    if (conflictingTable) {
      throw new SheetSchemaError(
        `ZAPISY table name ${REGISTRATIONS_TABLE_NAME} already exists with an unexpected table ID.`,
      );
    }

    await client.batchUpdate([{ addTable: { table: tableDefinition } }]);
    return;
  }

  await client.batchUpdate([
    {
      updateTable: {
        table: tableDefinition,
        fields: "name,range,rowsProperties,columnProperties",
      },
    },
  ]);
}

async function ensureHumanDateFormats(
  client: SheetsClient,
  metadata: readonly SheetMetadata[],
): Promise<void> {
  const offeringsSheet = metadata.find((sheet) => sheet.title === SHEET.offerings);
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  const requests: Record<string, unknown>[] = [];

  if (offeringsSheet) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: offeringsSheet.sheetId,
          startRowIndex: 1,
          startColumnIndex: 8,
          endColumnIndex: 10,
        },
        cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd.mm.yyyy" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    });
  }

  if (registrationSheet) {
    for (const [startColumnIndex, endColumnIndex] of [
      [9, 10],
      [24, 27],
    ] as const) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: registrationSheet.sheetId,
            startRowIndex: 1,
            startColumnIndex,
            endColumnIndex,
          },
          cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd.mm.yyyy" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      });
    }
  }

  await client.batchUpdate(requests);
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
      protection.startColumnIndex !== spec.startColumnIndex ||
      protection.endColumnIndex !== spec.endColumnIndex
    ) {
      warnings.push(`ZAPISY protection is inconsistent: ${spec.description}. Run sheet:bootstrap.`);
    }
  }
}

function assertRegistrationTable(table: TableMetadata | undefined): void {
  if (!table) {
    throw new SheetSchemaError(
      `Missing native ZAPISY table ${REGISTRATIONS_TABLE_NAME}. Run sheet:bootstrap.`,
    );
  }

  if (
    table.name !== REGISTRATIONS_TABLE_NAME ||
    table.startRowIndex !== 0 ||
    table.startColumnIndex !== 0 ||
    table.endColumnIndex !== REGISTRATION_HEADERS.length
  ) {
    throw new SheetSchemaError(
      `Native ZAPISY table ${REGISTRATIONS_TABLE_NAME} has an invalid range.`,
    );
  }

  for (const expected of REGISTRATION_TABLE_COLUMNS) {
    const actual = table.columnProperties.find(
      (column) => column.columnIndex === expected.columnIndex,
    );
    const columnTypeMatches =
      actual &&
      (expected.columnName === "ASSIGNED_GROUP_ID"
        ? actual.columnType === expected.columnType || actual.columnType === "DROPDOWN"
        : actual.columnType === expected.columnType);

    if (!actual || actual.columnName !== expected.columnName || !columnTypeMatches) {
      throw new SheetSchemaError(
        `Native ZAPISY table column ${expected.columnName} has an invalid contract.`,
      );
    }

    if (expected.columnName === "STATUS") {
      const actualValues = new Set(actual.dropdownValues ?? []);
      const expectedValues = Object.values(REGISTRATION_STATUS);
      if (
        actualValues.size !== expectedValues.length ||
        expectedValues.some((value) => !actualValues.has(value))
      ) {
        throw new SheetSchemaError("Native ZAPISY STATUS dropdown has invalid values.");
      }
    }
  }
}

export async function bootstrapSheetStructure(
  client: SheetsClient,
  options: SheetBootstrapOptions = {},
): Promise<void> {
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
  metadata = await client.getSheetMetadata();
  await ensureRegistrationProtections(client, metadata, options);
  await ensureRegistrationTable(client, metadata);
  await ensureHumanDateFormats(client, metadata);
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

  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  assertRegistrationTable(
    registrationSheet?.tables?.find((table) => table.tableId === REGISTRATIONS_TABLE_ID),
  );

  const [cityRows, seasonRows, offeringRows, groupRows, settingsRows] = await Promise.all([
    client.getValues(`${SHEET.cities}!A:ZZ`),
    client.getValues(`${SHEET.seasons}!A:ZZ`),
    client.getValues(`${SHEET.offerings}!A:ZZ`),
    client.getValues(`${SHEET.groups}!A:ZZ`),
    client.getValues(`${SHEET.settings}!A:ZZ`),
  ]);

  const cityHeaders = createHeaderMap(cityRows[0] ?? [], SHEET_SCHEMA[SHEET.cities]);
  const seasonHeaders = createHeaderMap(seasonRows[0] ?? [], SHEET_SCHEMA[SHEET.seasons]);
  const offeringHeaders = createHeaderMap(offeringRows[0] ?? [], SHEET_SCHEMA[SHEET.offerings]);
  const groupHeaders = createHeaderMap(groupRows[0] ?? [], SHEET_SCHEMA[SHEET.groups]);
  const settingsHeaders = createHeaderMap(settingsRows[0] ?? [], SHEET_SCHEMA[SHEET.settings]);

  const warnings: string[] = [];
  const cities: City[] = [];
  const seasons: Season[] = [];
  const offerings: ClassOffering[] = [];
  const groups: InternalGroup[] = [];

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

  for (const [offset, row] of seasonRows.slice(1).entries()) {
    const rowNumber = offset + 2;
    const parsed = parseSeasonRow(row, seasonHeaders);
    warnAboutCatalogControls(row, rowNumber, seasonHeaders, "SEZONY", warnings);
    if (parsed) {
      seasons.push(parsed);
    } else if (rowHasContent(row)) {
      warnings.push(
        `SEZONY row ${rowNumber} is incomplete or has an invalid technical ID and will be ignored.`,
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

  for (const [offset, row] of groupRows.slice(1).entries()) {
    const rowNumber = offset + 2;
    const parsed = parseGroupRow(row, groupHeaders);
    warnAboutCatalogControls(row, rowNumber, groupHeaders, "GRUPY", warnings);
    if (parsed) {
      groups.push(parsed);
    } else if (rowHasContent(row)) {
      warnings.push(
        `GRUPY row ${rowNumber} is incomplete or has an invalid technical ID and will be ignored.`,
      );
    }
  }

  assertUniqueIds(cities, "city");
  assertUniqueIds(seasons, "season");
  assertUniqueIds(offerings, "offering");
  assertUniqueIds(groups, "group");

  const cityIds = new Set(cities.map((city) => city.id));
  const seasonIds = new Set(seasons.map((season) => season.id));
  const offeringIds = new Set(offerings.map((offering) => offering.id));

  for (const offering of offerings) {
    if (!cityIds.has(offering.cityId)) {
      warnings.push(`Offering ${offering.id} references unknown city ${offering.cityId}.`);
    }
  }

  for (const group of groups) {
    if (!seasonIds.has(group.seasonId)) {
      warnings.push(`Group ${group.id} references unknown season ${group.seasonId}.`);
    }
    if (!offeringIds.has(group.offeringId)) {
      warnings.push(`Group ${group.id} references unknown offering ${group.offeringId}.`);
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

  const missingSettingKeys = REQUIRED_SETTING_KEYS.filter((key) => !settingKeys.has(key));
  if (missingSettingKeys.length > 0) {
    throw new SheetSchemaError(`Missing required setting keys: ${missingSettingKeys.join(", ")}`);
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

  const currentSeasonId = (settingValues.get(SETTING_KEY.currentSeasonId) ?? "").trim();
  if (!currentSeasonId) {
    warnings.push(`USTAWIENIA ${SETTING_KEY.currentSeasonId} is empty. Registrations cannot open.`);
  } else {
    const currentSeason = seasons.find((season) => season.id === currentSeasonId);
    if (!currentSeason) {
      warnings.push(
        `USTAWIENIA ${SETTING_KEY.currentSeasonId} references unknown season ${currentSeasonId}.`,
      );
    } else if (!currentSeason.active) {
      warnings.push(`USTAWIENIA ${SETTING_KEY.currentSeasonId} references an inactive season.`);
    } else {
      for (const offering of offerings.filter((candidate) => candidate.active)) {
        const activeGroups = groups.filter(
          (group) =>
            group.active && group.seasonId === currentSeason.id && group.offeringId === offering.id,
        );
        if (activeGroups.length === 0) {
          warnings.push(
            `Active offering ${offering.id} has no active group in current season ${currentSeason.id} and will not be public.`,
          );
        }
      }
    }
  }

  const privacyUrl = (settingValues.get(SETTING_KEY.privacyNoticeUrl) ?? "").trim();
  const privacyVersion = (settingValues.get(SETTING_KEY.privacyNoticeVersion) ?? "").trim();
  if (!privacyUrl || !privacyVersion) {
    warnings.push("USTAWIENIA privacy notice URL and version are incomplete.");
  }

  return {
    sheets: titles,
    cityCount: cities.length,
    seasonCount: seasons.length,
    offeringCount: offerings.length,
    groupCount: groups.length,
    warnings,
  };
}
