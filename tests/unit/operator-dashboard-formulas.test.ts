import { describe, expect, it } from "vitest";

import {
  POSSIBLE_DUPLICATE_COUNT_FORMULA,
  buildFreePlacesSummaryFormula,
} from "@/infrastructure/google/operator-sheet";

describe("operator dashboard formulas", () => {
  it("ignores zero-length strings when counting possible duplicate references", () => {
    expect(POSSIBLE_DUPLICATE_COUNT_FORMULA).toBe("=SUMPRODUCT(--(LEN(ZAPISY!AB2:AB)>0))");
    expect(POSSIBLE_DUPLICATE_COUNT_FORMULA).not.toContain("COUNTIF");
  });

  it("does not report zero free places when group capacities are unknown", () => {
    expect(buildFreePlacesSummaryFormula(12, 29)).toBe(
      '=IF(COUNT(F12:F29)<>ROWS(F12:F29);"BRAK DANYCH";SUM(H12:H29))',
    );
    expect(buildFreePlacesSummaryFormula(12, 11)).toBe('="BRAK DANYCH"');
  });
});
