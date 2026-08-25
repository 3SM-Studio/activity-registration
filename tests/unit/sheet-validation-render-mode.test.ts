import { describe, expect, it } from "vitest";

import { REGISTRATION_STATUS } from "@/domain/registration";
import { validateSheetStructure } from "@/infrastructure/google/sheet-admin";
import {
  REGISTRATION_HEADERS,
  REGISTRATION_TABLE_COLUMNS,
  REGISTRATIONS_TABLE_ID,
  REGISTRATIONS_TABLE_NAME,
  SHEET,
  SHEET_SCHEMA,
  SYSTEM_SCHEMA_VERSION,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient, TableMetadata } from "@/infrastructure/google/sheets-client";

const UNFORMATTED_VALUES = { valueRenderOption: "UNFORMATTED_VALUE" } as const;

function registrationTable(): TableMetadata {
  return {
    tableId: REGISTRATIONS_TABLE_ID,
    name: REGISTRATIONS_TABLE_NAME,
    startRowIndex: 0,
    endRowIndex: 2,
    startColumnIndex: 0,
    endColumnIndex: REGISTRATION_HEADERS.length,
    columnProperties: REGISTRATION_TABLE_COLUMNS.map((column) => ({
      columnIndex: column.columnIndex,
      columnName: column.columnName,
      columnType: column.columnType,
      ...(column.columnName === "STATUS"
        ? { dropdownValues: Object.values(REGISTRATION_STATUS) }
        : {}),
    })),
  };
}

describe("validateSheetStructure catalog value rendering", () => {
  it("reads catalog sheets unformatted so native Google date serials stay locale-independent", async () => {
    const calls: Array<
      Readonly<{
        range: string;
        valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
      }>
    > = [];

    const rowsByRange = new Map<string, readonly (readonly unknown[])[]>([
      [`${SHEET.cities}!1:1`, [SHEET_SCHEMA[SHEET.cities]]],
      [`${SHEET.seasons}!1:1`, [SHEET_SCHEMA[SHEET.seasons]]],
      [`${SHEET.offerings}!1:1`, [SHEET_SCHEMA[SHEET.offerings]]],
      [`${SHEET.groups}!1:1`, [SHEET_SCHEMA[SHEET.groups]]],
      [`${SHEET.registrations}!1:1`, [SHEET_SCHEMA[SHEET.registrations]]],
      [`${SHEET.notifications}!1:1`, [SHEET_SCHEMA[SHEET.notifications]]],
      [`${SHEET.settings}!1:1`, [SHEET_SCHEMA[SHEET.settings]]],
      [`${SHEET.cities}!A:ZZ`, [SHEET_SCHEMA[SHEET.cities], ["gdynia", "Gdynia", true, 10]]],
      [
        `${SHEET.seasons}!A:ZZ`,
        [SHEET_SCHEMA[SHEET.seasons], ["test-2026-2027", "2026/2027", 46266, 46599, true, 10]],
      ],
      [
        `${SHEET.offerings}!A:ZZ`,
        [
          SHEET_SCHEMA[SHEET.offerings],
          ["off-1", "gdynia", "Hip-hop", "", true, 10, "ROLLING", "CLOSED", "", "", false],
        ],
      ],
      [`${SHEET.groups}!A:ZZ`, [SHEET_SCHEMA[SHEET.groups]]],
      [
        `${SHEET.settings}!A:ZZ`,
        [
          SHEET_SCHEMA[SHEET.settings],
          ["SYSTEM_SCHEMA_VERSION", String(SYSTEM_SCHEMA_VERSION)],
          ["REGISTRATIONS_OPEN", "FALSE"],
          ["CURRENT_SEASON_ID", "test-2026-2027"],
          ["PUBLIC_FORM_TITLE", "Zapisy"],
          ["SUCCESS_MESSAGE", "Dziękujemy"],
          ["PRIVACY_NOTICE_URL", "/privacy"],
          ["PRIVACY_NOTICE_VERSION", "test-v4"],
        ],
      ],
    ]);

    const client: SheetsClient = {
      async getValues(range, options) {
        calls.push({
          range,
          ...(options?.valueRenderOption ? { valueRenderOption: options.valueRenderOption } : {}),
        });
        return rowsByRange.get(range) ?? [];
      },
      async updateValues() {},
      async appendValues() {},
      async appendTableRow() {},
      async clearValues() {},
      async getSheetMetadata() {
        return Object.keys(SHEET_SCHEMA).map((title, index) => ({
          title,
          sheetId: index + 1,
          ...(title === SHEET.registrations ? { tables: [registrationTable()] } : {}),
        }));
      },
      async batchUpdate() {},
    };

    const report = await validateSheetStructure(client);

    expect(report.seasonCount).toBe(1);
    for (const sheet of [SHEET.cities, SHEET.seasons, SHEET.offerings, SHEET.groups]) {
      expect(calls).toContainEqual({
        range: `${sheet}!A:ZZ`,
        ...UNFORMATTED_VALUES,
      });
    }
    expect(calls).toContainEqual({ range: `${SHEET.settings}!A:ZZ` });
  });
});
