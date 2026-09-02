import { REGISTRATION_STATUS } from "@/domain/registration";
import { cell, createHeaderMap } from "@/infrastructure/google/header-map";
import { parseGroupRow } from "@/infrastructure/google/parsers";
import {
  GROUP_HEADERS,
  OFFERING_HEADERS,
  OPERATOR_DASHBOARD_SHEET,
  REGISTRATION_HEADERS,
  REGISTRATION_TABLE_COLUMNS,
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
export const POSSIBLE_DUPLICATE_COUNT_FORMULA = "=SUMPRODUCT(--(LEN(ZAPISY!AB2:AB)>0))";

function formulaText(value: string): string {
  return value.replace(/"/g, '""');
}

function statusCountExpression(currentSeasonId: string, status: string): string {
  return `COUNTIFS(ZAPISY!V2:V;"${formulaText(currentSeasonId)}";ZAPISY!P2:P;"${formulaText(status)}")`;
}

export function buildStatusCountFormula(currentSeasonId: string, status: string): string {
  return `=${statusCountExpression(currentSeasonId, status)}`;
}

export function buildPossibleDuplicateCountFormula(currentSeasonId: string): string {
  return `=SUMPRODUCT(--(ZAPISY!V2:V="${formulaText(currentSeasonId)}");--(LEN(ZAPISY!AB2:AB)>0))`;
}

export function buildAttentionFormula(currentSeasonId: string): string {
  const seasonId = formulaText(currentSeasonId);
  return (
    buildPossibleDuplicateCountFormula(currentSeasonId) +
    `+COUNTIFS(ZAPISY!V2:V;"${seasonId}";ZAPISY!P2:P;"CONFIRMED";ZAPISY!X2:X;"")` +
    `+COUNTIFS(ZAPISY!V2:V;"${seasonId}";ZAPISY!P2:P;"CONTACTED";ZAPISY!Y2:Y;"")` +
    `+COUNTIFS(ZAPISY!V2:V;"${seasonId}";ZAPISY!P2:P;"CONFIRMED";ZAPISY!Z2:Z;"")` +
    `+COUNTIFS(ZAPISY!V2:V;"${seasonId}";ZAPISY!P2:P;"REJECTED";ZAPISY!AA2:AA;"")` +
    `+COUNTIFS(ZAPISY!V2:V;"${seasonId}";ZAPISY!P2:P;"CANCELLED";ZAPISY!AA2:AA;"")`
  );
}

export function buildFreePlacesSummaryFormula(firstGroupRow: number): string {
  return `=IF(COUNTA(A${firstGroupRow}:A)=0;"BRAK DANYCH";IF(COUNTIFS(A${firstGroupRow}:A;"<>";F${firstGroupRow}:F;"-")+COUNTIFS(A${firstGroupRow}:A;"<>";F${firstGroupRow}:F;"")>0;"BRAK DANYCH";SUMIF(A${firstGroupRow}:A;"<>";H${firstGroupRow}:H)))`;
}

export function buildAgeLabel(ageMin: number | null, ageMax: number | null): string {
  if (ageMin === null && ageMax === null) return "bez limitu";
  if (ageMin !== null && ageMax === null) return `${ageMin}+`;
  if (ageMin === null && ageMax !== null) return `do ${ageMax}`;
  return `${ageMin}-${ageMax}`;
}

export function buildConfirmedGroupCountFormula(
  currentSeasonId: string,
  dashboardRow: number,
): string {
  return `=COUNTIFS(ZAPISY!V$2:V;"${formulaText(currentSeasonId)}";ZAPISY!X$2:X;$A${dashboardRow};ZAPISY!P$2:P;"CONFIRMED")`;
}

export const OPERATOR_DASHBOARD_LAYOUT = {
  hiddenGroupIdColumnIndex: 0,
  visibleStartColumnIndex: 1,
  groupHeaderRow: 11,
  groupStartRow: 12,
  dataEndRow: 1000,
} as const;

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
  const [groupRows, offeringRows, settingsRows] = await Promise.all([
    client.getValues(`${SHEET.groups}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
    client.getValues(`${SHEET.offerings}!A:ZZ`),
    client.getValues(`${SHEET.settings}!A:ZZ`),
  ]);
  const groupHeaders = createHeaderMap(groupRows[0] ?? [], GROUP_HEADERS);
  const offeringHeaders = createHeaderMap(offeringRows[0] ?? [], OFFERING_HEADERS);
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

  const offeringNames = new Map(
    offeringRows.slice(1).flatMap((row) => {
      const id = cell(row, offeringHeaders, "OFFERING_ID");
      const name = cell(row, offeringHeaders, "NAME");
      return id && name ? [[id, name] as const] : [];
    }),
  );

  const groups = groupRows
    .slice(1)
    .map((row) => parseGroupRow(row, groupHeaders))
    .filter((group) => group !== null)
    .filter((group) => group.active && group.seasonId === currentSeasonId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"));

  await client.clearValues(`${OPERATOR_DASHBOARD_SHEET}!A:K`);

  const firstGroupRow = OPERATOR_DASHBOARD_LAYOUT.groupStartRow;
  const freePlacesFormula = buildFreePlacesSummaryFormula(firstGroupRow);
  const attentionFormula = buildAttentionFormula(currentSeasonId);
  const statusCount = (status: string) => statusCountExpression(currentSeasonId, status);

  const summaryRows = [
    [stringCell(""), stringCell("PANEL OPERATORA - POZYTYWKA")],
    [
      stringCell(""),
      stringCell(
        `Bieżący stan zapisów • sezon ${currentSeasonId} • dane uczestników są w zakładce ZAPISY`,
      ),
    ],
    [],
    [
      stringCell(""),
      stringCell("NOWE"),
      stringCell(""),
      stringCell("W TOKU"),
      stringCell(""),
      stringCell("LISTA REZERWOWA"),
      stringCell(""),
      stringCell("POTWIERDZONE"),
    ],
    [
      stringCell(""),
      formulaCell(buildStatusCountFormula(currentSeasonId, "NEW")),
      stringCell(""),
      formulaCell(`=${statusCount("IN_REVIEW")}+${statusCount("CONTACTED")}`),
      stringCell(""),
      formulaCell(buildStatusCountFormula(currentSeasonId, "WAITLISTED")),
      stringCell(""),
      formulaCell(buildStatusCountFormula(currentSeasonId, "CONFIRMED")),
    ],
    [],
    [
      stringCell(""),
      stringCell("WYMAGA UWAGI"),
      stringCell(""),
      stringCell("ZAMKNIĘTE"),
      stringCell(""),
      stringCell("AKTYWNE ZGŁOSZENIA"),
      stringCell(""),
      stringCell("WOLNE MIEJSCA"),
    ],
    [
      stringCell(""),
      formulaCell(attentionFormula),
      stringCell(""),
      formulaCell(`=${statusCount("REJECTED")}+${statusCount("CANCELLED")}`),
      stringCell(""),
      formulaCell(
        `=${statusCount("NEW")}+${statusCount("IN_REVIEW")}+${statusCount("CONTACTED")}+` +
          `${statusCount("WAITLISTED")}+${statusCount("CONFIRMED")}`,
      ),
      stringCell(""),
      formulaCell(freePlacesFormula),
    ],
    [],
    [stringCell(""), stringCell("GRUPY I MIEJSCA")],
    [
      stringCell(""),
      stringCell("Grupa"),
      stringCell("Zajęcia"),
      stringCell("Wiek"),
      stringCell("Termin"),
      stringCell("Pojemność"),
      stringCell("Potwierdzeni"),
      stringCell("Wolne"),
      stringCell("Obłożenie"),
    ],
  ];

  const groupDashboardRows = groups.map((group, index) => {
    const rowNumber = firstGroupRow + index;
    const ageLabel = buildAgeLabel(group.ageMin, group.ageMax);
    const termLabel = [group.dayOfWeek, group.startTime, group.endTime ? `-${group.endTime}` : null]
      .filter(Boolean)
      .join(" ");
    const capacityCell = group.capacity === null ? stringCell("-") : numberCell(group.capacity);
    const confirmedCell = formulaCell(buildConfirmedGroupCountFormula(currentSeasonId, rowNumber));
    const freeCell =
      group.capacity === null
        ? stringCell("-")
        : formulaCell(`=MAX(0;F${rowNumber}-G${rowNumber})`);
    const occupancyCell =
      group.capacity === null
        ? stringCell("")
        : formulaCell(`=IF(F${rowNumber}=0;0;G${rowNumber}/F${rowNumber})`);

    return [
      stringCell(group.id),
      stringCell(group.name),
      stringCell(offeringNames.get(group.offeringId) ?? group.offeringId),
      stringCell(ageLabel),
      stringCell(termLabel || "do ustalenia"),
      capacityCell,
      confirmedCell,
      freeCell,
      occupancyCell,
    ];
  });

  const requests: Record<string, unknown>[] = [];
  for (const rule of [...(dashboard.conditionalFormats ?? [])].sort(
    (left, right) => right.index - left.index,
  )) {
    requests.push({
      deleteConditionalFormatRule: { sheetId: dashboard.sheetId, index: rule.index },
    });
  }

  requests.push(
    {
      unmergeCells: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 0,
          endRowIndex: 30,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 0,
          endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
          startColumnIndex: 0,
          endColumnIndex: 11,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } },
            textFormat: {
              foregroundColorStyle: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } },
              fontFamily: "Roboto",
              fontSize: 10,
              bold: false,
            },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "CLIP",
          },
        },
        fields: "userEnteredFormat",
      },
    },
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
          gridProperties: { frozenRowCount: OPERATOR_DASHBOARD_LAYOUT.groupHeaderRow },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: dashboard.sheetId,
          dimension: "COLUMNS",
          startIndex: OPERATOR_DASHBOARD_LAYOUT.hiddenGroupIdColumnIndex,
          endIndex: OPERATOR_DASHBOARD_LAYOUT.hiddenGroupIdColumnIndex + 1,
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
  );

  const columnWidths = [150, 210, 80, 190, 100, 115, 90, 100];
  columnWidths.forEach((pixelSize, index) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: dashboard.sheetId,
          dimension: "COLUMNS",
          startIndex: index + 1,
          endIndex: index + 2,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    });
  });

  const merge = (rowIndex: number, startColumnIndex: number, endColumnIndex: number) => ({
    mergeCells: {
      range: {
        sheetId: dashboard.sheetId,
        startRowIndex: rowIndex,
        endRowIndex: rowIndex + 1,
        startColumnIndex,
        endColumnIndex,
      },
      mergeType: "MERGE_ALL",
    },
  });
  requests.push(merge(0, 1, 9), merge(1, 1, 9), merge(9, 1, 9));
  for (const rowIndex of [3, 4, 6, 7]) {
    for (const startColumnIndex of [1, 3, 5, 7]) {
      requests.push(merge(rowIndex, startColumnIndex, startColumnIndex + 2));
    }
  }

  requests.push(
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 1,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 0.184, green: 0.122, blue: 0.184 } },
            textFormat: {
              foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } },
              fontFamily: "Roboto",
              fontSize: 16,
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 1,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 1, green: 0.976, blue: 0.949 } },
          },
        },
        fields: "userEnteredFormat.backgroundColorStyle",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 9,
          endRowIndex: 10,
          startColumnIndex: 1,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 0.184, green: 0.122, blue: 0.184 } },
            textFormat: {
              foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } },
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 10,
          endRowIndex: 11,
          startColumnIndex: 1,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: { red: 0.945, green: 0.839, blue: 0.776 } },
            textFormat: { bold: true },
            horizontalAlignment: "CENTER",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: firstGroupRow - 1,
          endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields:
          "userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: firstGroupRow - 1,
          endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
          startColumnIndex: 3,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields:
          "userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: firstGroupRow - 1,
          endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        cell: { userEnteredFormat: { numberFormat: { type: "TEXT", pattern: "@" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: firstGroupRow - 1,
          endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
          startColumnIndex: 8,
          endColumnIndex: 9,
        },
        cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0%" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
  );

  const cardFormats = [
    [3, 1, { red: 0.976, green: 0.91, blue: 0.937 }, { red: 0.541, green: 0.114, blue: 0.31 }],
    [3, 3, { red: 0.91, green: 0.941, blue: 0.996 }, { red: 0.157, green: 0.333, blue: 0.651 }],
    [3, 5, { red: 1, green: 0.957, blue: 0.839 }, { red: 0.478, green: 0.302, blue: 0 }],
    [3, 7, { red: 0.89, green: 0.957, blue: 0.91 }, { red: 0.137, green: 0.424, blue: 0.231 }],
    [6, 1, { red: 0.992, green: 0.91, blue: 0.91 }, { red: 0.608, green: 0.11, blue: 0.11 }],
    [6, 3, { red: 0.925, green: 0.922, blue: 0.929 }, { red: 0.345, green: 0.376, blue: 0.416 }],
    [6, 5, { red: 0.93, green: 0.96, blue: 0.95 }, { red: 0.08, green: 0.35, blue: 0.32 }],
    [6, 7, { red: 1, green: 0.976, blue: 0.949 }, { red: 0.35, green: 0.25, blue: 0.2 }],
  ] as const;
  for (const [rowIndex, columnIndex, background, foreground] of cardFormats) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 2,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: background },
            textFormat: { foregroundColorStyle: { rgbColor: foreground }, bold: true },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat",
      },
    });
    requests.push({
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: rowIndex + 1,
          endRowIndex: rowIndex + 2,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 2,
        },
        cell: { userEnteredFormat: { textFormat: { fontSize: 18, bold: true } } },
        fields: "userEnteredFormat.textFormat",
      },
    });
  }

  requests.push(
    {
      repeatCell: {
        range: {
          sheetId: dashboard.sheetId,
          startRowIndex: 7,
          endRowIndex: 8,
          startColumnIndex: 7,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 13, bold: true },
            wrapStrategy: "CLIP",
          },
        },
        fields: "userEnteredFormat.textFormat,userEnteredFormat.wrapStrategy",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: dashboard.sheetId,
          dimension: "ROWS",
          startIndex: 7,
          endIndex: 8,
        },
        properties: { pixelSize: 42 },
        fields: "pixelSize",
      },
    },
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [
            {
              sheetId: dashboard.sheetId,
              startRowIndex: firstGroupRow - 1,
              endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
              startColumnIndex: 7,
              endColumnIndex: 8,
            },
          ],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [
                {
                  userEnteredValue: `=AND($A${firstGroupRow}<>"";$F${firstGroupRow}<>"";$F${firstGroupRow}<>"-";$H${firstGroupRow}=0)`,
                },
              ],
            },
            format: {
              backgroundColorStyle: { rgbColor: { red: 0.992, green: 0.91, blue: 0.91 } },
              textFormat: { bold: true },
            },
          },
        },
      },
    },
    {
      addConditionalFormatRule: {
        index: 1,
        rule: {
          ranges: [
            {
              sheetId: dashboard.sheetId,
              startRowIndex: firstGroupRow - 1,
              endRowIndex: OPERATOR_DASHBOARD_LAYOUT.dataEndRow,
              startColumnIndex: 8,
              endColumnIndex: 9,
            },
          ],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [
                {
                  userEnteredValue: `=AND($A${firstGroupRow}<>"";ISNUMBER($I${firstGroupRow});$I${firstGroupRow}>=90%)`,
                },
              ],
            },
            format: {
              backgroundColorStyle: { rgbColor: { red: 1, green: 0.957, blue: 0.839 } },
              textFormat: { bold: true },
            },
          },
        },
      },
    },
  );

  await client.batchUpdate(requests);
}

export function buildAssignedGroupTableRequest(activeGroupIds: readonly string[]) {
  const uniqueGroupIds = [...new Set(activeGroupIds.map((id) => id.trim()).filter(Boolean))];
  const columnProperties = REGISTRATION_TABLE_COLUMNS.map((column) => {
    if (column.columnIndex !== GROUP_COLUMN_INDEX || uniqueGroupIds.length === 0) {
      return column;
    }

    return {
      columnIndex: column.columnIndex,
      columnName: column.columnName,
      columnType: "DROPDOWN",
      dataValidationRule: {
        condition: {
          type: "ONE_OF_LIST",
          values: uniqueGroupIds.map((value) => ({ userEnteredValue: value })),
        },
      },
    } as const;
  });

  return {
    updateTable: {
      table: {
        tableId: REGISTRATIONS_TABLE_ID,
        columnProperties,
      },
      fields: "columnProperties",
    },
  } as const;
}

async function readDashboardGroupIds(client: SheetsClient): Promise<readonly string[]> {
  const rows = await client.getValues(
    `${OPERATOR_DASHBOARD_SHEET}!A${OPERATOR_DASHBOARD_LAYOUT.groupStartRow}:A${OPERATOR_DASHBOARD_LAYOUT.dataEndRow}`,
  );
  return rows.map((row) => String(row[0] ?? "").trim()).filter((value) => value.length > 0);
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
  await bootstrapDashboard(client, dashboard);

  const activeGroupIds = await readDashboardGroupIds(client);
  let metadata = await client.getSheetMetadata();
  let sheet = registrationSheet(metadata);
  const registrationTable = (sheet.tables ?? []).find(
    (table) => table.tableId === REGISTRATIONS_TABLE_ID,
  );
  if (!registrationTable) {
    throw new Error("Missing native Rejestracje table for operator console bootstrap.");
  }

  const expectedGroupIds = [...new Set(activeGroupIds.map((id) => id.trim()).filter(Boolean))];
  const groupColumn = registrationTable.columnProperties.find(
    (column) => column.columnIndex === GROUP_COLUMN_INDEX,
  );
  const actualGroupIds = new Set(groupColumn?.dropdownValues ?? []);
  const groupDropdownIsCurrent =
    expectedGroupIds.length === 0
      ? groupColumn?.columnType === "TEXT"
      : groupColumn?.columnType === "DROPDOWN" &&
        actualGroupIds.size === expectedGroupIds.length &&
        expectedGroupIds.every((id) => actualGroupIds.has(id));

  // Google Sheets does not expose native dropdown option colors through the public API.
  // Avoid rewriting table columnProperties when the group dropdown is already current,
  // so operator-configured chip colors on STATUS survive routine bootstrap runs.
  if (!groupDropdownIsCurrent) {
    await client.batchUpdate([buildAssignedGroupTableRequest(activeGroupIds)]);
    metadata = await client.getSheetMetadata();
    sheet = registrationSheet(metadata);
  }

  await client.batchUpdate(buildOperatorSheetRequests(sheet));
}

export async function validateOperatorSheetExperience(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const sheet = registrationSheet(metadata);

  if (!metadata.some((candidate) => candidate.title === OPERATOR_DASHBOARD_SHEET)) {
    throw new Error("PANEL_OPERATORA sheet is missing.");
  }

  const activeGroupIds = await readDashboardGroupIds(client);
  const registrationTable = (sheet.tables ?? []).find(
    (table) => table.tableId === REGISTRATIONS_TABLE_ID,
  );
  const groupColumn = registrationTable?.columnProperties.find(
    (column) => column.columnIndex === GROUP_COLUMN_INDEX,
  );

  if (!groupColumn) {
    throw new Error("ZAPISY ASSIGNED_GROUP_ID table column is missing.");
  }

  if (activeGroupIds.length === 0) {
    if (groupColumn.columnType !== "TEXT") {
      throw new Error("ZAPISY ASSIGNED_GROUP_ID must be TEXT when no active groups exist.");
    }
  } else {
    if (groupColumn.columnType !== "DROPDOWN") {
      throw new Error("ZAPISY ASSIGNED_GROUP_ID is not a native dropdown.");
    }

    const expectedValues = new Set(activeGroupIds);
    const actualValues = new Set(groupColumn.dropdownValues ?? []);
    if (
      actualValues.size !== expectedValues.size ||
      [...expectedValues].some((value) => !actualValues.has(value))
    ) {
      throw new Error("ZAPISY ASSIGNED_GROUP_ID dropdown has stale group IDs.");
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
  for (const formula of OWNED_OPERATOR_FORMAT_FORMULAS) {
    if (!configuredFormulas.has(formula)) {
      throw new Error(`ZAPISY operator conditional format is missing: ${formula}.`);
    }
  }

  const dashboardHeader = await client.getValues(`${OPERATOR_DASHBOARD_SHEET}!B1:I1`);
  if (dashboardHeader[0]?.[0] !== "PANEL OPERATORA - POZYTYWKA") {
    throw new Error("PANEL_OPERATORA dashboard content is missing.");
  }
}
