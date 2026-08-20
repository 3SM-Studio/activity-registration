import { REGISTRATION_STATUS } from "@/domain/registration";
import {
  REGISTRATION_HEADERS,
  REGISTRATIONS_TABLE_ID,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetMetadata, SheetsClient } from "@/infrastructure/google/sheets-client";

const STATUS_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("STATUS");
const POSSIBLE_DUPLICATE_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("POSSIBLE_DUPLICATE_OF");

if (STATUS_COLUMN_INDEX < 0 || POSSIBLE_DUPLICATE_COLUMN_INDEX < 0) {
  throw new Error("Registration operator columns are missing from the sheet contract.");
}

export const REGISTRATION_OPERATOR_FILTER_VIEW_TITLES = {
  active: "Pozytywka · Nowe i w toku",
  waitlist: "Pozytywka · Lista rezerwowa",
  confirmed: "Pozytywka · Potwierdzone",
} as const;

const TECHNICAL_COLUMN_RANGES = [
  { startIndex: 0, endIndex: 2 },
  { startIndex: 3, endIndex: 5 },
  { startIndex: 17, endIndex: 23 },
  { startIndex: 26, endIndex: 28 },
] as const;

const STATUS_FORMATS = [
  {
    status: REGISTRATION_STATUS.new,
    background: { red: 1, green: 0.949, blue: 0.8 },
    foreground: { red: 0.45, green: 0.25, blue: 0.02 },
  },
  {
    status: REGISTRATION_STATUS.inReview,
    background: { red: 0.89, green: 0.94, blue: 1 },
    foreground: { red: 0.08, green: 0.28, blue: 0.52 },
  },
  {
    status: REGISTRATION_STATUS.contacted,
    background: { red: 0.91, green: 0.88, blue: 1 },
    foreground: { red: 0.3, green: 0.17, blue: 0.5 },
  },
  {
    status: REGISTRATION_STATUS.waitlisted,
    background: { red: 1, green: 0.91, blue: 0.82 },
    foreground: { red: 0.5, green: 0.24, blue: 0.04 },
  },
  {
    status: REGISTRATION_STATUS.confirmed,
    background: { red: 0.86, green: 0.96, blue: 0.88 },
    foreground: { red: 0.08, green: 0.35, blue: 0.16 },
  },
  {
    status: REGISTRATION_STATUS.rejected,
    background: { red: 1, green: 0.88, blue: 0.88 },
    foreground: { red: 0.55, green: 0.08, blue: 0.08 },
  },
  {
    status: REGISTRATION_STATUS.cancelled,
    background: { red: 0.92, green: 0.92, blue: 0.92 },
    foreground: { red: 0.3, green: 0.3, blue: 0.3 },
  },
] as const;

function statusFormula(status: string): string {
  return `=$P2="${status}"`;
}

export const POSSIBLE_DUPLICATE_FORMULA = '=$AA2<>""';

export const OWNED_OPERATOR_FORMAT_FORMULAS = new Set([
  ...STATUS_FORMATS.map(({ status }) => statusFormula(status)),
  POSSIBLE_DUPLICATE_FORMULA,
]);

function filterCriteria(visibleStatuses: readonly string[]) {
  const visible = new Set(visibleStatuses);
  return {
    [String(STATUS_COLUMN_INDEX)]: {
      hiddenValues: Object.values(REGISTRATION_STATUS).filter((status) => !visible.has(status)),
    },
  } as const;
}

function desiredFilterViews() {
  return [
    {
      title: REGISTRATION_OPERATOR_FILTER_VIEW_TITLES.active,
      tableId: REGISTRATIONS_TABLE_ID,
      criteria: filterCriteria([
        REGISTRATION_STATUS.new,
        REGISTRATION_STATUS.inReview,
        REGISTRATION_STATUS.contacted,
      ]),
    },
    {
      title: REGISTRATION_OPERATOR_FILTER_VIEW_TITLES.waitlist,
      tableId: REGISTRATIONS_TABLE_ID,
      criteria: filterCriteria([REGISTRATION_STATUS.waitlisted]),
    },
    {
      title: REGISTRATION_OPERATOR_FILTER_VIEW_TITLES.confirmed,
      tableId: REGISTRATIONS_TABLE_ID,
      criteria: filterCriteria([REGISTRATION_STATUS.confirmed]),
    },
  ] as const;
}

function statusConditionalFormat(sheetId: number, status: (typeof STATUS_FORMATS)[number]) {
  return {
    ranges: [
      {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: STATUS_COLUMN_INDEX,
        endColumnIndex: STATUS_COLUMN_INDEX + 1,
      },
    ],
    booleanRule: {
      condition: {
        type: "CUSTOM_FORMULA",
        values: [{ userEnteredValue: statusFormula(status.status) }],
      },
      format: {
        backgroundColorStyle: { rgbColor: status.background },
        textFormat: {
          foregroundColorStyle: { rgbColor: status.foreground },
          bold: true,
        },
      },
    },
  } as const;
}

function duplicateConditionalFormat(sheetId: number) {
  return {
    ranges: [
      {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: REGISTRATION_HEADERS.length,
      },
    ],
    booleanRule: {
      condition: {
        type: "CUSTOM_FORMULA",
        values: [{ userEnteredValue: POSSIBLE_DUPLICATE_FORMULA }],
      },
      format: {
        backgroundColorStyle: {
          rgbColor: { red: 1, green: 0.95, blue: 0.86 },
        },
      },
    },
  } as const;
}

export function buildOperatorSheetRequests(
  sheet: SheetMetadata,
): readonly Record<string, unknown>[] {
  const requests: Record<string, unknown>[] = [];

  const registrationsTable = (sheet.tables ?? []).find(
    (table) => table.tableId === REGISTRATIONS_TABLE_ID,
  );
  if (!registrationsTable) {
    throw new Error("Missing native Rejestracje table for operator console bootstrap.");
  }

  for (const range of TECHNICAL_COLUMN_RANGES) {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: sheet.sheetId,
          dimension: "COLUMNS",
          startIndex: range.startIndex,
          endIndex: range.endIndex,
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    });
  }

  for (const desired of desiredFilterViews()) {
    const matching = (sheet.filterViews ?? []).filter((view) => view.title === desired.title);
    const [existing, ...duplicates] = matching;

    for (const duplicate of duplicates) {
      requests.push({ deleteFilterView: { filterId: duplicate.filterViewId } });
    }

    if (existing) {
      requests.push({
        updateFilterView: {
          filter: { filterViewId: existing.filterViewId, ...desired },
          fields: "title,tableId,criteria",
        },
      });
    } else {
      requests.push({ addFilterView: { filter: desired } });
    }
  }

  const ownedRules = (sheet.conditionalFormats ?? [])
    .filter((rule) => rule.customFormula && OWNED_OPERATOR_FORMAT_FORMULAS.has(rule.customFormula))
    .sort((left, right) => right.index - left.index);

  for (const rule of ownedRules) {
    requests.push({
      deleteConditionalFormatRule: {
        sheetId: sheet.sheetId,
        index: rule.index,
      },
    });
  }

  const desiredConditionalFormats = [
    duplicateConditionalFormat(sheet.sheetId),
    ...STATUS_FORMATS.map((status) => statusConditionalFormat(sheet.sheetId, status)),
  ];

  desiredConditionalFormats.forEach((rule, index) => {
    requests.push({
      addConditionalFormatRule: {
        rule,
        index,
      },
    });
  });

  return requests;
}

function registrationSheet(metadata: readonly SheetMetadata[]): SheetMetadata {
  const sheet = metadata.find((candidate) => candidate.title === SHEET.registrations);
  if (!sheet) {
    throw new Error("Missing ZAPISY sheet for operator console bootstrap.");
  }
  return sheet;
}

export async function bootstrapOperatorSheetExperience(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  await client.batchUpdate(buildOperatorSheetRequests(registrationSheet(metadata)));
}

export async function validateOperatorSheetExperience(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const sheet = registrationSheet(metadata);

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
  for (const formula of OWNED_OPERATOR_FORMAT_FORMULAS) {
    if (!configuredFormulas.has(formula)) {
      throw new Error(`ZAPISY operator conditional format is missing: ${formula}.`);
    }
  }
}
