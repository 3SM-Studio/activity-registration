import { describe, expect, it } from "vitest";

import {
  buildAssignedGroupTableRequest,
  buildOperatorSheetRequests,
  OWNED_OPERATOR_FORMAT_FORMULAS,
  REGISTRATION_OPERATOR_FILTER_VIEW_TITLES,
  REGISTRATION_STATUS_FORMATS,
} from "@/infrastructure/google/operator-sheet";
import type { SheetMetadata } from "@/infrastructure/google/sheets-client";

function sheet(overrides: Partial<SheetMetadata> = {}): SheetMetadata {
  return {
    sheetId: 1003,
    title: "ZAPISY",
    tables: [
      {
        tableId: "900001",
        name: "Rejestracje",
        columnProperties: [],
      },
    ],
    filterViews: [],
    conditionalFormats: [],
    ...overrides,
  };
}

describe("operator Sheets experience", () => {
  it("clears stale body colors and keeps the status column centered", () => {
    const requests = buildOperatorSheetRequests(sheet());
    const repeatCells = requests.flatMap((request) => {
      const repeat = request.repeatCell as Record<string, unknown> | undefined;
      return repeat ? [repeat] : [];
    });

    expect(repeatCells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          range: {
            sheetId: 1003,
            startRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 29,
          },
          fields: expect.stringContaining("userEnteredFormat.backgroundColorStyle"),
        }),
        {
          range: {
            sheetId: 1003,
            startRowIndex: 1,
            startColumnIndex: 15,
            endColumnIndex: 16,
          },
          cell: {
            userEnteredFormat: {
              horizontalAlignment: "CENTER",
              verticalAlignment: "MIDDLE",
            },
          },
          fields: "userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment",
        },
      ]),
    );
  });

  it("uses a distinct professional semantic color for every workflow status", () => {
    const formats = REGISTRATION_STATUS_FORMATS;

    expect(formats).toHaveLength(7);
    expect(new Set(formats.map(({ status }) => status)).size).toBe(7);
    expect(new Set(formats.map(({ background }) => JSON.stringify(background))).size).toBe(7);

    const requests = buildOperatorSheetRequests(sheet());
    const rules = requests.flatMap((request) => {
      const add = request.addConditionalFormatRule as
        { rule?: { booleanRule?: { format?: unknown } } } | undefined;
      return add?.rule?.booleanRule?.format ? [add.rule.booleanRule.format] : [];
    });

    expect(rules).toEqual(
      expect.arrayContaining(
        formats.map(({ background, foreground }) => ({
          backgroundColorStyle: { rgbColor: background },
          textFormat: {
            foregroundColorStyle: { rgbColor: foreground },
            bold: true,
          },
        })),
      ),
    );
  });

  it("hides technical columns but keeps operator fields outside hidden ranges", () => {
    const requests = buildOperatorSheetRequests(sheet());
    const hiddenRanges = requests.flatMap((request) => {
      const update = request.updateDimensionProperties as
        { range?: { startIndex?: number; endIndex?: number } } | undefined;
      return update?.range ? [update.range] : [];
    });

    expect(hiddenRanges).toEqual([
      { sheetId: 1003, dimension: "COLUMNS", startIndex: 0, endIndex: 2 },
      { sheetId: 1003, dimension: "COLUMNS", startIndex: 3, endIndex: 5 },
      { sheetId: 1003, dimension: "COLUMNS", startIndex: 17, endIndex: 23 },
      { sheetId: 1003, dimension: "COLUMNS", startIndex: 27, endIndex: 29 },
    ]);

    for (const operatorColumn of [2, 5, 6, 15, 16, 23, 24, 25, 26]) {
      expect(
        hiddenRanges.some(
          (range) =>
            typeof range.startIndex === "number" &&
            typeof range.endIndex === "number" &&
            operatorColumn >= range.startIndex &&
            operatorColumn < range.endIndex,
        ),
      ).toBe(false);
    }
  });

  it("uses a native table dropdown for active current-season group IDs", () => {
    const request = buildAssignedGroupTableRequest(["group-a", "group-b", "group-a"]);
    const updateTable = request.updateTable;
    const groupColumn = updateTable.table.columnProperties.find(
      (column) => column.columnIndex === 23,
    );

    expect(groupColumn).toEqual({
      columnIndex: 23,
      columnName: "ASSIGNED_GROUP_ID",
      columnType: "DROPDOWN",
      dataValidationRule: {
        condition: {
          type: "ONE_OF_LIST",
          values: [{ userEnteredValue: "group-a" }, { userEnteredValue: "group-b" }],
        },
      },
    });
    expect(buildOperatorSheetRequests(sheet()).some((item) => "setDataValidation" in item)).toBe(
      false,
    );
  });

  it("keeps the group table column as text when there are no active groups", () => {
    const request = buildAssignedGroupTableRequest([]);
    const groupColumn = request.updateTable.table.columnProperties.find(
      (column) => column.columnIndex === 23,
    );

    expect(groupColumn).toMatchObject({
      columnIndex: 23,
      columnName: "ASSIGNED_GROUP_ID",
      columnType: "TEXT",
    });
  });

  it("backs operator filter views with the native registration table", () => {
    const requests = buildOperatorSheetRequests(sheet());
    const filters = requests.flatMap((request) => {
      const add = request.addFilterView as
        | {
            filter?: { title?: string; tableId?: string; range?: unknown };
          }
        | undefined;
      return add?.filter ? [add.filter] : [];
    });

    expect(filters.map((filter) => filter.title)).toEqual(
      Object.values(REGISTRATION_OPERATOR_FILTER_VIEW_TITLES),
    );
    for (const filter of filters) {
      expect(filter.tableId).toBe("900001");
      expect(filter.range).toBeUndefined();
    }
  });

  it("updates existing owned filter views and removes duplicate copies", () => {
    const title = REGISTRATION_OPERATOR_FILTER_VIEW_TITLES.active;
    const requests = buildOperatorSheetRequests(
      sheet({
        filterViews: [
          { filterViewId: 101, title },
          { filterViewId: 102, title },
        ],
      }),
    );

    expect(requests).toEqual(
      expect.arrayContaining([
        { deleteFilterView: { filterId: 102 } },
        expect.objectContaining({
          updateFilterView: expect.objectContaining({
            filter: expect.objectContaining({
              filterViewId: 101,
              title,
              tableId: "900001",
            }),
          }),
        }),
      ]),
    );
  });

  it("fails closed when the native registration table is missing", () => {
    expect(() => buildOperatorSheetRequests(sheet({ tables: [] }))).toThrow(
      "Missing native Rejestracje table",
    );
  });

  it("replaces only owned conditional formats and preserves unrelated rules", () => {
    const ownedFormula = [...OWNED_OPERATOR_FORMAT_FORMULAS][0]!;
    const requests = buildOperatorSheetRequests(
      sheet({
        conditionalFormats: [
          { index: 0, customFormula: '=$A2="custom"' },
          { index: 1, customFormula: ownedFormula },
        ],
      }),
    );

    expect(requests).toContainEqual({
      deleteConditionalFormatRule: { sheetId: 1003, index: 1 },
    });
    expect(requests).not.toContainEqual({
      deleteConditionalFormatRule: { sheetId: 1003, index: 0 },
    });

    const addRules = requests.filter((request) => "addConditionalFormatRule" in request);
    expect(addRules).toHaveLength(OWNED_OPERATOR_FORMAT_FORMULAS.size);
  });
});
