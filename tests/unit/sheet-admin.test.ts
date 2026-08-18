import { describe, expect, it } from "vitest";

import { validateSheetStructure } from "@/infrastructure/google/sheet-admin";
import { SHEET, SHEET_SCHEMA } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

function createValidationClient(): SheetsClient {
  const rowsByRange = new Map<string, readonly (readonly unknown[])[]>([
    [`${SHEET.cities}!1:1`, [SHEET_SCHEMA[SHEET.cities]]],
    [`${SHEET.offerings}!1:1`, [SHEET_SCHEMA[SHEET.offerings]]],
    [`${SHEET.registrations}!1:1`, [SHEET_SCHEMA[SHEET.registrations]]],
    [`${SHEET.settings}!1:1`, [SHEET_SCHEMA[SHEET.settings]]],
    [
      `${SHEET.settings}!A:ZZ`,
      [
        SHEET_SCHEMA[SHEET.settings],
        ["SYSTEM_SCHEMA_VERSION", "1"],
        ["REGISTRATIONS_OPEN", "TAK"],
        ["PUBLIC_FORM_TITLE", "Zapisy"],
        ["SUCCESS_MESSAGE", "Dziękujemy"],
        ["PRIVACY_NOTICE_URL", "/privacy"],
        ["PRIVACY_NOTICE_VERSION", "test-v1"],
      ],
    ],
    [
      `${SHEET.cities}!A:ZZ`,
      [SHEET_SCHEMA[SHEET.cities], ["gdynia", "Gdynia", "TAK", 10], ["broken-city", "", "TAK", 20]],
    ],
    [
      `${SHEET.offerings}!A:ZZ`,
      [
        SHEET_SCHEMA[SHEET.offerings],
        ["off-1", "gdynia", "Hip-hop", "TAK", 10],
        ["off-2", "missing-city", "Contemporary", "TAK", 20],
        ["off-broken", "gdynia", "", "TAK", 30],
      ],
    ],
  ]);

  return {
    async getValues(range) {
      return rowsByRange.get(range) ?? [];
    },
    async updateValues() {},
    async appendValues() {},
    async clearValues() {},
    async getSheetMetadata() {
      return Object.keys(SHEET_SCHEMA).map((title, index) => ({
        title,
        sheetId: index + 1,
      }));
    },
    async batchUpdate() {},
  };
}

describe("validateSheetStructure", () => {
  it("reports malformed catalog rows and dangling city references", async () => {
    const report = await validateSheetStructure(createValidationClient());

    expect(report.cityCount).toBe(1);
    expect(report.offeringCount).toBe(2);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        "MIASTA row 3 is incomplete or has an invalid technical ID and will be ignored.",
        "OFERTY_ZAJEC row 4 is incomplete or has an invalid technical ID and will be ignored.",
        "Offering off-2 references unknown city missing-city.",
      ]),
    );
  });
  it("warns about invalid registration toggle and incomplete privacy configuration", async () => {
    const client = createValidationClient();
    const originalGetValues = client.getValues.bind(client);
    client.getValues = async (range) => {
      if (range === `${SHEET.settings}!A:ZZ`) {
        return [
          SHEET_SCHEMA[SHEET.settings],
          ["SYSTEM_SCHEMA_VERSION", "1"],
          ["REGISTRATIONS_OPEN", "MAYBE"],
          ["PUBLIC_FORM_TITLE", "Zapisy"],
          ["SUCCESS_MESSAGE", "Dziękujemy"],
          ["PRIVACY_NOTICE_URL", "/privacy"],
          ["PRIVACY_NOTICE_VERSION", ""],
        ];
      }
      return originalGetValues(range);
    };

    const report = await validateSheetStructure(client);

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("REGISTRATIONS_OPEN"),
        expect.stringContaining("privacy notice URL and version"),
      ]),
    );
  });
});
