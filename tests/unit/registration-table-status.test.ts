import { describe, expect, it } from "vitest";

import { REGISTRATION_STATUS } from "@/domain/registration";
import { REGISTRATION_TABLE_COLUMNS } from "@/infrastructure/google/sheets-contracts";

describe("registration table status column", () => {
  it("uses exactly the operator workflow statuses in the Google Sheets dropdown", () => {
    const statusColumn = REGISTRATION_TABLE_COLUMNS.find((column) => column.columnName === "STATUS");

    expect(statusColumn).toMatchObject({
      columnName: "STATUS",
      columnType: "DROPDOWN",
      dropdownValues: Object.values(REGISTRATION_STATUS),
    });
  });
});
