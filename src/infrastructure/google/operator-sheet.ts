import { REGISTRATION_STATUS } from "@/domain/registration";
import { cell, createHeaderMap } from "@/infrastructure/google/header-map";
import { parseGroupRow } from "@/infrastructure/google/parsers";
import {
  GROUP_HEADERS,
  OPERATOR_DASHBOARD_SHEET,
  REGISTRATION_HEADERS,
  SETTING_KEY,
  SETTINGS_HEADERS,
  REGISTRATIONS_TABLE_ID,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetMetadata, SheetsClient } from "@/infrastructure/google/sheets-client";

const STATUS_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("STATUS");
const GROUP_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("ASSIGNED_GROUP_ID");
const CONTACTED_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("CONTACTED_AT");
const CONFIRMED_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("CONFIRMED_AT");
const CLOSED_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("CLOSED_AT");
const POSSIBLE_DUPLICATE_COLUMN_INDEX = REGISTRATION_HEADERS.indexOf("POSSIBLE_DUPLICATE_OF");

if (
  [
    STATUS_COLUMN_INDEX,
    GROUP_COLUMN_INDEX,
    CONTACTED_COLUMN_INDEX,
    CONFIRMED_COLUMN_INDEX,
    CLOSED_COLUMN_INDEX,
    POSSIBLE_DUPLICATE_COLUMN_INDEX,
  ].some((index) => index < 0)
) {
  throw new Error("Registration operator columns are missing from the sheet contract.");
}

export const REGISTRATION_OPERATOR_FILTER_VIEW_TITLES = {
  active: "Pozytywka · Nowe i w toku",
  waitlist: "Pozytywka · Lista rezerwowa",
  confirmed: "Pozytywka · Potwierdzone",
  closed: "Pozytywka · Zamknięte",
} as const;

const TECHNICAL_COLUMN_RANGES = [
  { startIndex: 0, endIndex: 2 },
  { startIndex: 3, endIndex: 5 },
  { startIndex: 17, endIndex: 23 },
  { startIndex: 27, endIndex: 29 },
] as const;

export const REGISTRATION_STATUS_FORMATS = [
  {
    status: REGISTRATION_STATUS.new,
    background: { red: 0.976, green: 0.91, blue: 0.937 },
    foreground: { red: 0.541, green: 0.114, blue: 0.31 },
  },
  {
    status: REGISTRATION_STATUS.inReview,
    background: { red: 0.91, green: 0.941, blue: 0.996 },
    foreground: { red: 0.157, green: 0.333, blue: 0.651 },
  },
  {
    status: REGISTRATION_STATUS.contacted,
    background: { red: 0.89, green: 0.953, blue: 0.937 },
    foreground: { red: 0.059, green: 0.384, blue: 0.373 },
  },
  {
    status: REGISTRATION_STATUS.waitlisted,
    background: { red: 1, green: 0.957, blue: 0.839 },
    foreground: { red: 0.478, green: 0.302, blue: 0 },
  },
  {
    status: REGISTRATION_STATUS.confirmed,
    background: { red: 0.89, green: 0.957, blue: 0.91 },
    foreground: { red: 0.137, green: 0.424, blue: 0.231 },
  },
  {
    status: REGISTRATION_STATUS.rejected,
    background: { red: 0.992, green: 0.91, blue: 0.91 },
    foreground: { red: 0.608, green: 0.11, blue: 0.11 },
  },
  {
    status: REGISTRATION_STATUS.cancelled,
    background: { red: 0.925, green: 0.922, blue: 0.929 },
    foreground: { red: 0.345, green: 0.376, blue: 0.416 },
  },
] as const;

function statusFormula(status: string): string {
  return `=$P2="${status}"`;
}

export const POSSIBLE_DUPLICATE_FORMULA = '=$AB2<>""';
export const CONFIRMED_WITHOUT_GROUP_FORMULA = '=($P2="CONFIRMED")*($X2="")';
export const CONTACTED_WITHOUT_DATE_FORMULA = '=($P2="CONTACTED")*($Y2="")';
export const CONFIRMED_WITHOUT_DATE_FORMULA = '=($P2="CONFIRMED")*($Z2="")';
export const CLOSED_WITHOUT_DATE_FORMULA =
  '=OR(AND($P2="REJECTED";$AA2="");AND($P2="CANCELLED";$AA2=""))';

export const OWNED_OPERATOR_FORMAT_FORMULAS = new Set([
  ...REGISTRATION_STATUS_FORMATS.map(({ status }) => statusFormula(status)),
  POSSIBLE_DUPLICATE_FORMULA,
  CONFIRMED_WITHOUT_GROUP_FORMULA,
  CONTACTED_WITHOUT_DATE_FORMULA,
  CONFIRMED_WITHOUT_DATE_FORMULA,
  CLOSED_WITHOUT_DATE_FORMULA,
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
    {
      title: REGISTRATION_OPERATOR_FILTER_VIEW_TITLES.closed,
      tableId: REGISTRATIONS_TABLE_ID,
      criteria: filterCriteria([REGISTRATION_STATUS.rejected, REGISTRATION_STATUS.cancelled]),
    },
  ] as const;
}

function clearLegacyBodyVisualOverrides(sheetId: number) {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: REGISTRATION_HEADERS.length,
      },
      cell: { userEnteredFormat: { textFormat: {} } },
      fields:
        "userEnteredFormat.backgroundColor,userEnteredFormat.backgroundColorStyle," +
        "userEnteredFormat.textFormat.foregroundColor," +
        "userEnteredFormat.textFormat.foregroundColorStyle,userEnteredFormat.textFormat.bold",
    },
  } as const;
}

function statusColumnAlignment(sheetId: number) {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: STATUS_COLUMN_INDEX,
        endColumnIndex: STATUS_COLUMN_INDEX + 1,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
        },
      },
      fields: "userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment",
    },
  } as const;
}

function statusConditionalFormat(
  sheetId: number,
  status: (typeof REGISTRATION_STATUS_FORMATS)[number],
) {
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

function warningConditionalFormat(
  sheetId: number,
  formula: string,
  startColumnIndex: number,
  endColumnIndex: number,
  color: { red: number; green: number; blue: number },
) {
  return {
    ranges: [
      {
        sheetId,
        startRowIndex: 1,
        startColumnIndex,
        endColumnIndex,
      },
    ],
    booleanRule: {
      condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: formula }] },
      format: { backgroundColorStyle: { rgbColor: color } },
    },
  } as const;
}

function registrationSheet(metadata: readonly SheetMetadata[]): SheetMetadata {
  const sheet = metadata.find((candidate) => candidate.title === SHEET.registrations);
  if (!sheet) {
    throw new Error("Missing ZAPISY sheet for operator console bootstrap.");
  }
  return sheet;
}

async function ensureDashboardSheet(client: SheetsClient): Promise<SheetMetadata> {
  let metadata = await client.getSheetMetadata();
  let dashboard = metadata.find((sheet) => sheet.title === OPERATOR_DASHBOARD_SHEET);
  if (!dashboard) {
    await client.batchUpdate([{ addSheet: { properties: { title: OPERATOR_DASHBOARD_SHEET } } }]);
    metadata = await client.getSheetMetadata();
    dashboard = metadata.find((sheet) => sheet.title === OPERATOR_DASHBOARD_SHEET);
  }
  if (!dashboard) {
    throw new Error("Could not create PANEL_OPERATORA sheet.");
  }
  return dashboard;
}

function stringCell(value: string) {
  return { userEnteredValue: { stringValue: value } } as const;
}

function numberCell(value: number) {
  return { userEnteredValue: { numberValue: value } } as const;
}

function formulaCell(value: string) {
  return { userEnteredValue: { formulaValue: value } } as const;
}

async function bootstrapDashboard(client: SheetsClient, dashboard: SheetMetadata): Promise<void> {
  const [groupRows, settingsRows] = await Promise.all([
    client.getValues(`${SHEET.groups}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
    client.getValues(`${SHEET.settings}!A:ZZ`),
  ]);
  const headers = createHeaderMap(groupRows[0] ?? [], GROUP_HEADERS);
  const settingsHeaders = createHeaderMap(settingsRows[0] ?? [], SETTINGS_HEADERS);
  const currentSeasonRows = settingsRows
    .slice(1)
    .filter((row) => cell(row, settingsHeaders, "KEY") === SETTING_KEY.currentSeasonId);
  if (currentSeasonRows.length !== 1) {
    throw new Error("PANEL_OPERATORA requires exactly one CURRENT_SEASON_ID setting.");
  }
  const currentSeasonId = cell(currentSeasonRows[0] ?? [], settingsHeaders, "VALUE");
  if (!currentSeasonId) {
    throw new Error("PANEL_OPERATORA requires CURRENT_SEASON_ID.");
  }

  const groups = groupRows
    .slice(1)
    .map((row) => parseGroupRow(row, headers))
    .filter((group) => group !== null)
    .filter((group) => group.active && group.seasonId === currentSeasonId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"));

  await client.clearValues(`${OPERATOR_DASHBOARD_SHEET}!A:K`);

  const summaryRows = [
    [stringCell("PANEL OPERATORA - POZYTYWKA")],
    [stringCell("Stan bieżących zapisów. Dane uczestników pozostają w zakładce ZAPISY.")],
    [],
    [stringCell("Nowe"), formulaCell('=COUNTIF(ZAPISY!P2:P;"NEW")')],
    [
      stringCell("W toku"),
      formulaCell('=COUNTIF(ZAPISY!P2:P;"IN_REVIEW")+COUNTIF(ZAPISY!P2:P;"CONTACTED")'),
    ],
    [stringCell("Lista rezerwowa"), formulaCell('=COUNTIF(ZAPISY!P2:P;"WAITLISTED")')],
    [stringCell("Potwierdzone"), formulaCell('=COUNTIF(ZAPISY!P2:P;"CONFIRMED")')],
    [
      stringCell("Zamknięte"),
      formulaCell('=COUNTIF(ZAPISY!P2:P;"REJECTED")+COUNTIF(ZAPISY!P2:P;"CANCELLED")'),
    ],
    [stringCell("Możliwe duplikaty"), formulaCell('=COUNTIF(ZAPISY!AB2:AB;"<>")')],
    [
      stringCell("Potwierdzone bez grupy"),
      formulaCell('=COUNTIFS(ZAPISY!P2:P;"CONFIRMED";ZAPISY!X2:X;"")'),
    ],
    [],
    [
      stringCell("ID grupy"),
      stringCell("Grupa"),
      stringCell("Oferta"),
      stringCell("Wiek"),
      stringCell("Termin"),
      stringCell("Pojemność"),
      stringCell("Potwierdzeni"),
      stringCell("Wolne"),
    ],
  ];

  const groupDashboardRows = groups.map((group) => {
    const rowNumber = groups.indexOf(group) + summaryRows.length + 1;
    const ageLabel =
      group.ageMin === null && group.ageMax === null
        ? "bez limitu"
        : `${group.ageMin ?? "…"}-${group.ageMax ?? "…"}`;
    const termLabel = [group.dayOfWeek, group.startTime, group.endTime ? `-${group.endTime}` : null]
      .filter(Boolean)
      .join(" ");
    return [
      stringCell(group.id),
      stringCell(group.name),
      stringCell(group.offeringId),
      stringCell(ageLabel),
      stringCell(termLabel || "do ustalenia"),
      group.capacity === null ? stringCell("-") : numberCell(group.capacity),
      formulaCell(`=COUNTIFS(ZAPISY!X2:X;A${rowNumber};ZAPISY!P2:P;"CONFIRMED")`),
      group.capacity === null
        ? stringCell("-")
        : formulaCell(`=MAX(0;F${rowNumber}-G${rowNumber})`),
    ];
  });

  await client.batchUpdate([
    {
      updateCells: {
        start: { sheetId: dashboard.sheetId, rowIndex: 0, columnIndex: 0 },
        rows: [...summaryRows, ...groupDashboardRows].map((values) => ({ values })),
        fields: "userEnteredValue",
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId: dashboard.sheetId,
          gridProperties: { frozenRowCount: 12 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: dashboard.sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 1,
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 0.161, green: 0.09, blue: 0.176 } },
            textFormat: {
              bold: true,
              foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } },
            },
          },
        },
        fields: "userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 11,
          endRowIndex: 12,
          startColumnIndex: 0,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 0.945, green: 0.839, blue: 0.776 } },
            textFormat: { bold: true },
          },
        },
        fields: "userEnteredFormat.backgroundColorStyle,userEnteredFormat.textFormat",
      },
    },
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [
            {
              sheetId: dashboard.sheetId,
              startRowIndex: 12,
              startColumnIndex: 7,
              endColumnIndex: 8,
            },
          ],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: '=AND($F13<>"-";$H13=0)' }],
            },
            format: {
              backgroundColorStyle: { rgbColor: { red: 0.992, green: 0.91, blue: 0.91 } },
              textFormat: { bold: true },
            },
          },
        },
      },
    },
  ]);
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

  requests.push(clearLegacyBodyVisualOverrides(sheet.sheetId));
  requests.push(statusColumnAlignment(sheet.sheetId));

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

  requests.push({
    setDataValidation: {
      range: {
        sheetId: sheet.sheetId,
        startRowIndex: 1,
        startColumnIndex: GROUP_COLUMN_INDEX,
        endColumnIndex: GROUP_COLUMN_INDEX + 1,
      },
      rule: {
        condition: {
          type: "ONE_OF_RANGE",
          values: [{ userEnteredValue: `${OPERATOR_DASHBOARD_SHEET}!A13:A1000` }],
        },
        inputMessage:
          "Wybierz aktywną grupę bieżącego sezonu. Po przypisaniu sprawdź zgodność wieku i oferty.",
        strict: true,
        showCustomUi: true,
      },
    },
  });

  const headerNotes = new Map<number, string>([
    [
      STATUS_COLUMN_INDEX,
      "NEW = nowe, IN_REVIEW = weryfikacja, CONTACTED = skontaktowano, WAITLISTED = lista rezerwowa, CONFIRMED = potwierdzono, REJECTED = odrzucono, CANCELLED = anulowano.",
    ],
    [
      REGISTRATION_HEADERS.indexOf("NOTES"),
      "Tylko neutralne informacje organizacyjne. Nie wpisuj danych zdrowotnych, diagnoz, leków, niepełnosprawności, religii, konfliktów rodzinnych ani innych danych wrażliwych.",
    ],
    [
      GROUP_COLUMN_INDEX,
      "Wybierz ID grupy z listy. Grupa musi pasować do sezonu, oferty i wieku uczestnika.",
    ],
    [CONTACTED_COLUMN_INDEX, "Data pierwszego skutecznego kontaktu z uczestnikiem lub opiekunem."],
    [CONFIRMED_COLUMN_INDEX, "Data potwierdzenia miejsca."],
    [
      CLOSED_COLUMN_INDEX,
      "Wymagane przy REJECTED i CANCELLED. Od tej daty liczona jest retencja zamkniętego zgłoszenia.",
    ],
  ]);

  for (const [columnIndex, note] of headerNotes) {
    if (columnIndex < 0) {
      continue;
    }
    requests.push({
      updateCells: {
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1,
        },
        rows: [{ values: [{ note }] }],
        fields: "note",
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
      deleteConditionalFormatRule: { sheetId: sheet.sheetId, index: rule.index },
    });
  }

  const warningColor = { red: 1, green: 0.92, blue: 0.75 };
  const dangerColor = { red: 1, green: 0.86, blue: 0.86 };
  const desiredConditionalFormats = [
    warningConditionalFormat(
      sheet.sheetId,
      POSSIBLE_DUPLICATE_FORMULA,
      0,
      REGISTRATION_HEADERS.length,
      { red: 1, green: 0.965, blue: 0.902 },
    ),
    warningConditionalFormat(
      sheet.sheetId,
      CONFIRMED_WITHOUT_GROUP_FORMULA,
      GROUP_COLUMN_INDEX,
      GROUP_COLUMN_INDEX + 1,
      dangerColor,
    ),
    warningConditionalFormat(
      sheet.sheetId,
      CONTACTED_WITHOUT_DATE_FORMULA,
      CONTACTED_COLUMN_INDEX,
      CONTACTED_COLUMN_INDEX + 1,
      warningColor,
    ),
    warningConditionalFormat(
      sheet.sheetId,
      CONFIRMED_WITHOUT_DATE_FORMULA,
      CONFIRMED_COLUMN_INDEX,
      CONFIRMED_COLUMN_INDEX + 1,
      warningColor,
    ),
    warningConditionalFormat(
      sheet.sheetId,
      CLOSED_WITHOUT_DATE_FORMULA,
      CLOSED_COLUMN_INDEX,
      CLOSED_COLUMN_INDEX + 1,
      dangerColor,
    ),
    ...REGISTRATION_STATUS_FORMATS.map((status) => statusConditionalFormat(sheet.sheetId, status)),
  ];

  desiredConditionalFormats.forEach((rule, index) => {
    requests.push({ addConditionalFormatRule: { rule, index } });
  });

  return requests;
}

export async function bootstrapOperatorSheetExperience(client: SheetsClient): Promise<void> {
  const dashboard = await ensureDashboardSheet(client);
  const metadata = await client.getSheetMetadata();
  await client.batchUpdate(buildOperatorSheetRequests(registrationSheet(metadata)));
  await bootstrapDashboard(client, dashboard);
}

export async function validateOperatorSheetExperience(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const sheet = registrationSheet(metadata);

  if (!metadata.some((candidate) => candidate.title === OPERATOR_DASHBOARD_SHEET)) {
    throw new Error("PANEL_OPERATORA sheet is missing.");
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
  for (const formula of OWNED_OPERATOR_FORMAT_FORMULAS) {
    if (!configuredFormulas.has(formula)) {
      throw new Error(`ZAPISY operator conditional format is missing: ${formula}.`);
    }
  }

  const dashboardHeader = await client.getValues(`${OPERATOR_DASHBOARD_SHEET}!A1:B1`);
  if (dashboardHeader[0]?.[0] !== "PANEL OPERATORA - POZYTYWKA") {
    throw new Error("PANEL_OPERATORA dashboard content is missing.");
  }
}
