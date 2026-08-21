import { describe, expect, it } from "vitest";

import { OPERATOR_DASHBOARD_LAYOUT } from "@/infrastructure/google/operator-sheet";

describe("operator dashboard layout", () => {
  it("keeps technical group IDs hidden while visible dashboard content starts in column B", () => {
    expect(OPERATOR_DASHBOARD_LAYOUT).toEqual({
      hiddenGroupIdColumnIndex: 0,
      visibleStartColumnIndex: 1,
      groupHeaderRow: 11,
      groupStartRow: 12,
    });
  });
});
