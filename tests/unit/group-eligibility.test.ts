import { describe, expect, it } from "vitest";

import { ageForGroupEligibility } from "@/domain/group-eligibility";

describe("ageForGroupEligibility", () => {
  it("uses age at season start for participants already born when the season begins", () => {
    expect(ageForGroupEligibility("2018-10-10", "2026-09-01", 7)).toBe(7);
  });

  it("uses age at submission when a child is born after the season starts", () => {
    expect(ageForGroupEligibility("2026-10-10", "2026-09-01", 0)).toBe(0);
  });
});
