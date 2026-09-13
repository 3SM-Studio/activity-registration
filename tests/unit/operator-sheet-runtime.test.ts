import { describe, expect, it } from "vitest";

import {
  buildSafeOperatorRuntimeRequests,
  buildStableDashboardFormulaCells,
  LEGACY_STATUS_CELL_FORMAT_FORMULAS,
  REQUIRED_OPERATOR_WARNING_FORMULAS,
} from "@/infrastructure/google/operator-sheet-runtime";
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

function addedConditionalFormatFormulas(requests: readonly Record<string, unknown>[]) {
  return requests.flatMap((request) => {
    const add = request.addConditionalFormatRule as
      | {
          rule?: {
            booleanRule?: {
              condition?: { values?: readonly { userEnteredValue?: string }[] };
            };
          };
        }
      | undefined;
    const formula = add?.rule?.booleanRule?.condition?.values?.[0]?.userEnteredValue;
    return formula ? [formula] : [];
  });
}

describe("safe operator Sheets runtime", () => {
  it("never emits structural native Table mutations", () => {
    const requests = buildSafeOperatorRuntimeRequests(sheet());

    expect(
      requests.some(
        (request) => "updateTable" in request || "addTable" in request || "deleteTable" in request,
      ),
    ).toBe(false);
  });

  it("keeps warning formats but does not add whole-cell STATUS colors", () => {
    const formulas = new Set(
      addedConditionalFormatFormulas(buildSafeOperatorRuntimeRequests(sheet())),
    );

    for (const formula of REQUIRED_OPERATOR_WARNING_FORMULAS) {
      expect(formulas.has(formula)).toBe(true);
    }

    for (const formula of LEGACY_STATUS_CELL_FORMAT_FORMULAS) {
      expect(formulas.has(formula)).toBe(false);
    }
  });

  it("removes previously installed legacy STATUS conditional formats", () => {
    const legacyFormula = [...LEGACY_STATUS_CELL_FORMAT_FORMULAS][0]!;
    const requests = buildSafeOperatorRuntimeRequests(
      sheet({
        conditionalFormats: [{ index: 7, customFormula: legacyFormula }],
      }),
    );

    expect(requests).toContainEqual({
      deleteConditionalFormatRule: { sheetId: 1003, index: 7 },
    });
    expect(addedConditionalFormatFormulas(requests)).not.toContain(legacyFormula);
  });

  it("uses whole-column dashboard references that do not drift when Sheets inserts rows", () => {
    const formulas = buildStableDashboardFormulaCells("2026-2027", ["group-a", "group-b"]);
    const newCount = formulas.find((cell) => cell.row === 5 && cell.column === 2)?.formula;
    const attention = formulas.find((cell) => cell.row === 8 && cell.column === 2)?.formula;
    const firstGroup = formulas.find((cell) => cell.row === 12 && cell.column === 7)?.formula;

    expect(newCount).toBe('=COUNTIFS(ZAPISY!V:V;"2026-2027";ZAPISY!P:P;"NEW")');
    expect(attention).toContain('ZAPISY!V:V;"2026-2027"');
    expect(attention).toContain('ZAPISY!AB:AB;"?*"');
    expect(firstGroup).toBe(
      '=COUNTIFS(ZAPISY!V:V;"2026-2027";ZAPISY!X:X;$A12;ZAPISY!P:P;"CONFIRMED")',
    );

    for (const cell of formulas) {
      expect(cell.formula).not.toMatch(/ZAPISY![A-Z]+\$?\d+:/);
    }
  });
});
