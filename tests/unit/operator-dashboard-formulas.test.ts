import { describe, expect, it } from "vitest";

import {
  POSSIBLE_DUPLICATE_COUNT_FORMULA,
  buildAgeLabel,
  buildAttentionFormula,
  buildConfirmedGroupCountFormula,
  buildFreePlacesSummaryFormula,
  buildPossibleDuplicateCountFormula,
  buildStatusCountFormula,
} from "@/infrastructure/google/operator-sheet";

describe("operator dashboard formulas", () => {
  it("ignores zero-length strings when counting possible duplicate references", () => {
    expect(POSSIBLE_DUPLICATE_COUNT_FORMULA).toBe("=SUMPRODUCT(--(LEN(ZAPISY!AB2:AB)>0))");
    expect(POSSIBLE_DUPLICATE_COUNT_FORMULA).not.toContain("COUNTIF");
  });

  it("scopes duplicate and attention counts to the current season", () => {
    expect(buildPossibleDuplicateCountFormula("2026-2027")).toBe(
      '=SUMPRODUCT(--(ZAPISY!V2:V="2026-2027");--(LEN(ZAPISY!AB2:AB)>0))',
    );
    expect(buildPossibleDuplicateCountFormula("2026-2027")).not.toContain("COUNTIF");
    expect(buildAttentionFormula("2026-2027")).toContain('ZAPISY!V2:V;"2026-2027"');
    expect(buildStatusCountFormula("2026-2027", "NEW")).toBe(
      '=COUNTIFS(ZAPISY!V2:V;"2026-2027";ZAPISY!P2:P;"NEW")',
    );
  });

  it("keeps group counts pinned to row 2 and scoped to the current season", () => {
    expect(buildConfirmedGroupCountFormula("2026-2027", 13)).toBe(
      '=COUNTIFS(ZAPISY!V$2:V;"2026-2027";ZAPISY!X$2:X;$A13;ZAPISY!P$2:P;"CONFIRMED")',
    );
  });

  it("does not report zero free places when any populated group has unknown capacity", () => {
    expect(buildFreePlacesSummaryFormula(12)).toBe(
      '=IF(COUNTA(A12:A)=0;"BRAK DANYCH";IF(COUNTIFS(A12:A;"<>";F12:F;"-")+COUNTIFS(A12:A;"<>";F12:F;"")>0;"BRAK DANYCH";SUMIF(A12:A;"<>";H12:H)))',
    );
  });

  it("uses human-readable age labels without date-like ellipses", () => {
    expect(buildAgeLabel(null, null)).toBe("bez limitu");
    expect(buildAgeLabel(18, null)).toBe("18+");
    expect(buildAgeLabel(null, 4)).toBe("do 4");
    expect(buildAgeLabel(4, 6)).toBe("4-6");
  });
});
