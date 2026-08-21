import { describe, expect, it } from "vitest";

import { POSSIBLE_DUPLICATE_COUNT_FORMULA } from "@/infrastructure/google/operator-sheet";

describe("operator dashboard formulas", () => {
  it("ignores zero-length strings when counting possible duplicate references", () => {
    expect(POSSIBLE_DUPLICATE_COUNT_FORMULA).toBe("=SUMPRODUCT(--(LEN(ZAPISY!AB2:AB)>0))");
    expect(POSSIBLE_DUPLICATE_COUNT_FORMULA).not.toContain("COUNTIF");
  });
});
