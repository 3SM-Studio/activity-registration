import { AGE_REVIEW_NOTE_MARKER, REGISTRATION_STATUS } from "@/domain/registration";
import { cell, createHeaderMap } from "@/infrastructure/google/header-map";
import {
  bootstrapOperatorSheetExperience,
  buildOperatorSheetRequests,
  CLOSED_WITHOUT_DATE_FORMULA,
  CONFIRMED_WITHOUT_DATE_FORMULA,
  CONFIRMED_WITHOUT_GROUP_FORMULA,
  CONTACTED_WITHOUT_DATE_FORMULA,
  OPERATOR_DASHBOARD_LAYOUT,
  POSSIBLE_DUPLICATE_FORMULA,
  REGISTRATION_OPERATOR_FILTER_VIEW_TITLES,
} from "@/infrastructure/google/operator-sheet";
import { parseGroupRow } from "@/infrastructure/google/parsers";
import {
  GROUP_HEADERS,
  OPERATOR_DASHBOARD_SHEET,
  REGISTRATION_HEADERS,
  REGISTRATIONS_TABLE_ID,
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetMetadata, SheetsClient } from "@/infrastructure/google/sheets-client";

const STATUS_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("STATUS");
const GROUP_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("ASSIGNED_GROUP_ID");

if (STATUS_COLUMN_INDEX < 0 || GROUP_COLUMN_INDEX < 0) {
  throw new Error("Registration operator columns are missing from the sheet contract.");
}

function statusFormula(status: string): string {
  return `=$P2="${status}"`;
}

export const LEGACY_STATUS_CELL_FORMAT_FORMULAS = new Set(
  Object.values(REGISTRATION_STATUS).map((status) => statusFormula(status)),
);

export const REQUIRED_OPERATOR_WARNING_FORMULAS = new Set([
  POSSIBLE_DUPLICATE_FORMULA,
  CONFIRMED_WITHOUT_GROUP_FORMULA,
  CONTACTED_WITHOUT_DATE_FORMULA,
  CONFIRMED_WITHOUT_DATE_FORMULA,
  CLOSED_WITHOUT_DATE_FORMULA,
]);

type AddConditionalFormatRequest = {
  rule?: {
    booleanRule?: {
      condition?: {
        values?: readonly { userEnteredValue?: string }[];
      };
    };
  };
};

type DashboardFormulaCell = Readonly<{
  row: number;
  column: number;
  formula: string;
}>;

function addedConditionalFormatFormula(request: Record<string, unknown>): string | null {
  const add = request.addConditionalFormatRule as AddConditionalFormatRequest | undefined;
  return add?.rule?.booleanRule?.condition?.values?.[0]?.userEnteredValue ?? null;
}

function registrationSheet(metadata: readonly SheetMetadata[]): SheetMetadata {
  const sheet = metadata.find((candidate) => candidate.title === SHEET.registrations);
  if (!sheet) {
    throw new Error("Missing ZAPISY sheet for safe operator runtime refresh.");
  }
  return sheet;
}

function formulaText(value: string): string {
  return value.replace(/"/g, '""');
}

function statusCountExpression(currentSeasonId: string, status: string): string {
  return `COUNTIFS(ZAPISY!V:V;"${formulaText(currentSeasonId)}";ZAPISY!P:P;"${formulaText(status)}")`;
}

function possibleDuplicateCountExpression(currentSeasonId: string): string {
  return `COUNTIFS(ZAPISY!V:V;"${formulaText(currentSeasonId)}";ZAPISY!AB:AB;"?*")`;
}

function attentionFormula(currentSeasonId: string): string {
  const seasonId = formulaText(currentSeasonId);
  return (
    `=${possibleDuplicateCountExpression(currentSeasonId)}` +
    `+COUNTIFS(ZAPISY!V:V;"${seasonId}";ZAPISY!P:P;"CONFIRMED";ZAPISY!X:X;"")` +
    `+COUNTIFS(ZAPISY!V:V;"${seasonId}";ZAPISY!P:P;"CONTACTED";ZAPISY!Y:Y;"")` +
    `+COUNTIFS(ZAPISY!V:V;"${seasonId}";ZAPISY!P:P;"CONFIRMED";ZAPISY!Z:Z;"")` +
    `+COUNTIFS(ZAPISY!V:V;"${seasonId}";ZAPISY!P:P;"REJECTED";ZAPISY!AA:AA;"")` +
    `+COUNTIFS(ZAPISY!V:V;"${seasonId}";ZAPISY!P:P;"CANCELLED";ZAPISY!AA:AA;"")` +
    `+COUNTIFS(ZAPISY!V:V;"${seasonId}";ZAPISY!Q:Q;"*${formulaText(AGE_REVIEW_NOTE_MARKER)}*")`
  );
}

export function buildStableDashboardFormulaCells(
  currentSeasonId: string,
  groupIds: readonly string[],
): readonly DashboardFormulaCell[] {
  const statusCount = (status: string) => statusCountExpression(currentSeasonId, status);
  const summary: DashboardFormulaCell[] = [
    { row: 5, column: 2, formula: `=${statusCount("NEW")}` },
    {
      row: 5,
      column: 4,
      formula: `=${statusCount("IN_REVIEW")}+${statusCount("CONTACTED")}`,
    },
    { row: 5, column: 6, formula: `=${statusCount("WAITLISTED")}` },
    { row: 5, column: 8, formula: `=${statusCount("CONFIRMED")}` },
    { row: 8, column: 2, formula: attentionFormula(currentSeasonId) },
    {
      row: 8,
      column: 4,
      formula: `=${statusCount("REJECTED")}+${statusCount("CANCELLED")}`,
    },
    {
      row: 8,
      column: 6,
      formula:
        `=${statusCount("NEW")}+${statusCount("IN_REVIEW")}+${statusCount("CONTACTED")}+` +
        `${statusCount("WAITLISTED")}+${statusCount("CONFIRMED")}`,
    },
  ];

  const groupCells = groupIds.map((_, index) => {
    const row = OPERATOR_DASHBOARD_LAYOUT.groupStartRow + index;
    return {
      row,
      column: 7,
      formula:
        `=COUNTIFS(ZAPISY!V:V;"${formulaText(currentSeasonId)}";` +
        `ZAPISY!X:X;$A${row};ZAPISY!P:P;"CONFIRMED")`,
    } satisfies DashboardFormulaCell;
  });

  return [...summary, ...groupCells];
}

function formulaUpdateRequest(sheetId: number, cell: DashboardFormulaCell) {
  return {
    updateCells: {
      range: {
        sheetId,
        startRowIndex: cell.row - 1,
        endRowIndex: cell.row,
        startColumnIndex: cell.column - 1,
        endColumnIndex: cell.column,
      },
      rows: [{ values: [{ userEnteredValue: { formulaValue: cell.formula } }] }],
      fields: "userEnteredValue",
    },
  } as const;
}

async function readCurrentSeasonId(client: SheetsClient): Promise<string> {
  const settingsRows = await client.getValues(`${SHEET.settings}!A:ZZ`);
  const settingsHeaders = createHeaderMap(settingsRows[0] ?? [], SETTINGS_HEADERS);
  const currentSeasonRows = settingsRows
    .slice(1)
    .filter((row) => cell(row, settingsHeaders, "KEY") === SETTING_KEY.currentSeasonId);

  if (currentSeasonRows.length !== 1) {
    throw new Error("Operator schema validation requires exactly one CURRENT_SEASON_ID setting.");
  }

  const currentSeasonId = cell(currentSeasonRows[0] ?? [], settingsHeaders, "VALUE");
  if (!currentSeasonId) {
    throw new Error("Operator schema validation requires CURRENT_SEASON_ID.");
  }

  return currentSeasonId;
}

async function readDashboardGroupIds(client: SheetsClient): Promise<readonly string[]> {
  const rows = await client.getValues(`${OPERATOR_DASHBOARD_SHEET}!A12:A1000`);
  return rows.map((row) => String(row[0] ?? "").trim()).filter((value) => value.length > 0);
}

async function readExpectedActiveGroupIds(
  client: SheetsClient,
  currentSeasonId: string,
): Promise<readonly string[]> {
  const groupRows = await client.getValues(`${SHEET.groups}!A:ZZ`, {
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const groupHeaders = createHeaderMap(groupRows[0] ?? [], GROUP_HEADERS);

  return groupRows
    .slice(1)
    .map((row) => parseGroupRow(row, groupHeaders))
    .filter((group) => group !== null)
    .filter((group) => group.active && group.seasonId === currentSeasonId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"))
    .map((group) => group.id);
}

async function stabilizeOperatorDashboardFormulas(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const dashboard = metadata.find((candidate) => candidate.title === OPERATOR_DASHBOARD_SHEET);
  if (!dashboard) {
    throw new Error("PANEL_OPERATORA sheet is missing. Run sheet:schema-sync.");
  }

  const currentSeasonId = await readCurrentSeasonId(client);
  const expectedGroupIds = await readExpectedActiveGroupIds(client, currentSeasonId);
  const requests = buildStableDashboardFormulaCells(currentSeasonId, expectedGroupIds).map((cell) =>
    formulaUpdateRequest(dashboard.sheetId, cell),
  );

  if (requests.length > 0) {
    await client.batchUpdate(requests);
  }
}

async function validateStableDashboardFormulas(
  client: SheetsClient,
  currentSeasonId: string,
  expectedGroupIds: readonly string[],
): Promise<void> {
  const expected = buildStableDashboardFormulaCells(currentSeasonId, expectedGroupIds);
  const summaryExpected = new Map(
    expected
      .filter((cell) => cell.column !== 7)
      .map((cell) => [`${cell.row}:${cell.column}`, cell.formula]),
  );
  const summaryRows = await client.getValues(`${OPERATOR_DASHBOARD_SHEET}!B5:H8`, {
    valueRenderOption: "FORMULA",
  });

  for (const [key, formula] of summaryExpected) {
    const [rowText, columnText] = key.split(":");
    const row = Number(rowText);
    const column = Number(columnText);
    const actual = summaryRows[row - 5]?.[column - 2];
    if (actual !== formula) {
      throw new Error(
        `PANEL_OPERATORA formula drift at row ${row}, column ${column}. Run sheet:schema-sync.`,
      );
    }
  }

  if (expectedGroupIds.length === 0) {
    return;
  }

  const firstRow = OPERATOR_DASHBOARD_LAYOUT.groupStartRow;
  const lastRow = firstRow + expectedGroupIds.length - 1;
  const groupRows = await client.getValues(`${OPERATOR_DASHBOARD_SHEET}!G${firstRow}:G${lastRow}`, {
    valueRenderOption: "FORMULA",
  });
  const groupExpected = expected.filter((cell) => cell.column === 7);

  for (const [index, cell] of groupExpected.entries()) {
    if (groupRows[index]?.[0] !== cell.formula) {
      throw new Error(
        `PANEL_OPERATORA group formula drift at row ${cell.row}. Run sheet:schema-sync.`,
      );
    }
  }
}

/**
 * Runtime-safe operator requests deliberately exclude the legacy status
 * conditional formats. Native Google Table dropdown chips own STATUS
 * presentation; warning conditional formats remain code-managed.
 *
 * This request set also contains no updateTable request, so it cannot mutate
 * native Table columnProperties while an operator is editing the sheet UI.
 */
export function buildSafeOperatorRuntimeRequests(
  sheet: SheetMetadata,
): readonly Record<string, unknown>[] {
  return buildOperatorSheetRequests(sheet).filter((request) => {
    const formula = addedConditionalFormatFormula(request);
    return formula === null || !LEGACY_STATUS_CELL_FORMAT_FORMULAS.has(formula);
  });
}

/**
 * Safe during normal operator work. This refreshes only the ZAPISY operator
 * presentation/filter/warning layer and removes legacy whole-cell STATUS
 * colors. It does not rebuild Tables, protections, dropdown values or the
 * dashboard structure.
 */
export async function refreshOperatorSheetRuntime(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const sheet = registrationSheet(metadata);
  const requests = buildSafeOperatorRuntimeRequests(sheet);

  if (
    requests.some(
      (request) => "updateTable" in request || "addTable" in request || "deleteTable" in request,
    )
  ) {
    throw new Error("Safe operator runtime attempted a structural Table mutation.");
  }

  await client.batchUpdate(requests);
  await stabilizeOperatorDashboardFormulas(client);
}

/**
 * Explicit structural maintenance path. It may update native Table metadata
 * (including ASSIGNED_GROUP_ID dropdown values), refreshes the dashboard and
 * then removes the legacy whole-cell STATUS conditional formats again.
 * Do not run this while an operator is editing dropdown presentation in UI.
 */
export async function syncOperatorSheetSchema(client: SheetsClient): Promise<void> {
  await bootstrapOperatorSheetExperience(client);
  await refreshOperatorSheetRuntime(client);
}

export async function validateSafeOperatorSheetExperience(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const sheet = registrationSheet(metadata);
  const dashboard = metadata.find((candidate) => candidate.title === OPERATOR_DASHBOARD_SHEET);

  if (!dashboard) {
    throw new Error("PANEL_OPERATORA sheet is missing. Run sheet:schema-sync.");
  }

  const registrationTable = (sheet.tables ?? []).find(
    (table) => table.tableId === REGISTRATIONS_TABLE_ID,
  );
  if (!registrationTable) {
    throw new Error("Missing native Rejestracje table. Run sheet:schema-sync.");
  }

  const statusColumn = registrationTable.columnProperties.find(
    (column) => column.columnIndex === STATUS_COLUMN_INDEX,
  );
  if (statusColumn?.columnType !== "DROPDOWN") {
    throw new Error("ZAPISY STATUS is not a native dropdown. Run sheet:schema-sync.");
  }

  const expectedStatuses = new Set(Object.values(REGISTRATION_STATUS));
  const actualStatuses = new Set(statusColumn.dropdownValues ?? []);
  if (
    actualStatuses.size !== expectedStatuses.size ||
    [...expectedStatuses].some((status) => !actualStatuses.has(status))
  ) {
    throw new Error("ZAPISY STATUS dropdown is stale. Run sheet:schema-sync.");
  }

  const currentSeasonId = await readCurrentSeasonId(client);
  const [expectedGroupIds, dashboardGroupIds] = await Promise.all([
    readExpectedActiveGroupIds(client, currentSeasonId),
    readDashboardGroupIds(client),
  ]);
  if (
    expectedGroupIds.length !== dashboardGroupIds.length ||
    expectedGroupIds.some((groupId, index) => dashboardGroupIds[index] !== groupId)
  ) {
    throw new Error("PANEL_OPERATORA group catalog is stale. Run sheet:schema-sync.");
  }

  const groupColumn = registrationTable.columnProperties.find(
    (column) => column.columnIndex === GROUP_COLUMN_INDEX,
  );
  if (!groupColumn) {
    throw new Error("ZAPISY ASSIGNED_GROUP_ID table column is missing. Run sheet:schema-sync.");
  }

  if (expectedGroupIds.length === 0) {
    if (groupColumn.columnType !== "TEXT") {
      throw new Error("ZAPISY ASSIGNED_GROUP_ID schema is stale. Run sheet:schema-sync.");
    }
  } else {
    if (groupColumn.columnType !== "DROPDOWN") {
      throw new Error("ZAPISY ASSIGNED_GROUP_ID is not a native dropdown. Run sheet:schema-sync.");
    }

    const expectedGroups = new Set(expectedGroupIds);
    const actualGroups = new Set(groupColumn.dropdownValues ?? []);
    if (
      actualGroups.size !== expectedGroups.size ||
      [...expectedGroups].some((groupId) => !actualGroups.has(groupId))
    ) {
      throw new Error("ZAPISY ASSIGNED_GROUP_ID dropdown is stale. Run sheet:schema-sync.");
    }
  }

  for (const title of Object.values(REGISTRATION_OPERATOR_FILTER_VIEW_TITLES)) {
    const matches = (sheet.filterViews ?? []).filter((view) => view.title === title);
    if (matches.length !== 1) {
      throw new Error(`ZAPISY operator filter view is missing or duplicated: ${title}.`);
    }
  }

  const configuredFormulas = new Set(
    (sheet.conditionalFormats ?? []).flatMap((rule) =>
      rule.customFormula ? [rule.customFormula] : [],
    ),
  );

  for (const formula of REQUIRED_OPERATOR_WARNING_FORMULAS) {
    if (!configuredFormulas.has(formula)) {
      throw new Error(`ZAPISY operator warning format is missing: ${formula}.`);
    }
  }

  for (const formula of LEGACY_STATUS_CELL_FORMAT_FORMULAS) {
    if (configuredFormulas.has(formula)) {
      throw new Error(
        `Legacy whole-cell STATUS conditional format is still installed: ${formula}.`,
      );
    }
  }

  const dashboardHeader = await client.getValues(`${OPERATOR_DASHBOARD_SHEET}!B1:I1`);
  if (dashboardHeader[0]?.[0] !== "PANEL OPERATORA - POZYTYWKA") {
    throw new Error("PANEL_OPERATORA dashboard content is missing. Run sheet:schema-sync.");
  }

  await validateStableDashboardFormulas(client, currentSeasonId, expectedGroupIds);
}
