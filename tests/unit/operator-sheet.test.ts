import { describe, expect, it } from "vitest";

import {
  buildOperatorSheetRequests,
  OWNED_OPERATOR_FORMAT_FORMULAS,
  REGISTRATION_OPERATOR_FILTER_VIEW_TITLES,
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
      { sheetId: 1003, dimension: "COLUMNS", startIndex: 26, endIndex: 28 },
    ]);

    for (const operatorColumn of [15, 16, 23, 24, 25]) {
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

  it("backs operator filter views with the native registration table", () => {
    const requests = buildOperatorSheetRequests(sheet());
    const filters = requests.flatMap((request) => {
      const add = request.addFilterView as
        | { filter?: { title?: string; tableId?: string; range?: unknown } }
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
