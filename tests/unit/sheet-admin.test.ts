import { describe, expect, it } from "vitest";

import {
  bootstrapSheetStructure,
  validateSheetStructure,
} from "@/infrastructure/google/sheet-admin";
import {
  REGISTRATION_HEADERS,
  REGISTRATION_TABLE_COLUMNS,
  REGISTRATIONS_TABLE_ID,
  REGISTRATIONS_TABLE_NAME,
  SHEET,
  SHEET_SCHEMA,
  SYSTEM_SCHEMA_VERSION,
} from "@/infrastructure/google/sheets-contracts";
import type {
  ProtectedRangeMetadata,
  SheetsClient,
  TableMetadata,
} from "@/infrastructure/google/sheets-client";

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
        ? { dropdownValues: ["NEW", "IN_PROGRESS", "ACCEPTED", "CANCELLED"] }
        : {}),
    })),
  };
}

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
        ["SYSTEM_SCHEMA_VERSION", String(SYSTEM_SCHEMA_VERSION)],
        ["REGISTRATIONS_OPEN", "TAK"],
        ["PUBLIC_FORM_TITLE", "Zapisy"],
        ["SUCCESS_MESSAGE", "Dziękujemy"],
        ["PRIVACY_NOTICE_URL", "/privacy"],
        ["PRIVACY_NOTICE_VERSION", "test-v2"],
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
}

function createBootstrapClient(protectedRanges: readonly ProtectedRangeMetadata[] = []) {
  const batchRequests: Record<string, unknown>[] = [];
  const rowsByRange = new Map<string, readonly (readonly unknown[])[]>();

  for (const [title, headers] of Object.entries(SHEET_SCHEMA)) {
    rowsByRange.set(`${title}!1:1`, [headers]);
  }
  rowsByRange.set(`${SHEET.registrations}!A:ZZ`, [SHEET_SCHEMA[SHEET.registrations]]);

  rowsByRange.set(`${SHEET.settings}!A:ZZ`, [
    SHEET_SCHEMA[SHEET.settings],
    ["SYSTEM_SCHEMA_VERSION", String(SYSTEM_SCHEMA_VERSION)],
    ["REGISTRATIONS_OPEN", "NIE"],
    ["PUBLIC_FORM_TITLE", "Zapisy"],
    ["SUCCESS_MESSAGE", "Dziękujemy"],
    ["PRIVACY_NOTICE_URL", ""],
    ["PRIVACY_NOTICE_VERSION", ""],
  ]);

  const client: SheetsClient = {
    async getValues(range) {
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
        ...(title === SHEET.registrations ? { protectedRanges } : {}),
      }));
    },
    async batchUpdate(requests) {
      batchRequests.push(...requests);
    },
  };

  return { client, batchRequests };
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
    client.getValues = async (range, options) => {
      if (range === `${SHEET.settings}!A:ZZ`) {
        return [
          SHEET_SCHEMA[SHEET.settings],
          ["SYSTEM_SCHEMA_VERSION", String(SYSTEM_SCHEMA_VERSION)],
          ["REGISTRATIONS_OPEN", "MAYBE"],
          ["PUBLIC_FORM_TITLE", "Zapisy"],
          ["SUCCESS_MESSAGE", "Dziękujemy"],
          ["PRIVACY_NOTICE_URL", "/privacy"],
          ["PRIVACY_NOTICE_VERSION", ""],
        ];
      }
      return originalGetValues(range, options);
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

describe("bootstrapSheetStructure", () => {
  it("adds warning protections with STATUS and NOTES left editable", async () => {
    const { client, batchRequests } = createBootstrapClient();

    await bootstrapSheetStructure(client);

    const protectedRanges = batchRequests.flatMap((request) => {
      const addProtectedRange = request.addProtectedRange as
        { protectedRange?: Record<string, unknown> } | undefined;
      return addProtectedRange?.protectedRange ? [addProtectedRange.protectedRange] : [];
    });

    expect(protectedRanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: "activity-registration:system-columns:identity-and-pii",
          warningOnly: true,
          range: expect.objectContaining({ startColumnIndex: 0, endColumnIndex: 15 }),
        }),
        expect.objectContaining({
          description: "activity-registration:system-columns:metadata",
          warningOnly: true,
          range: expect.objectContaining({ startColumnIndex: 17, endColumnIndex: 22 }),
        }),
      ]),
    );
  });

  it("creates a native registrations table with typed columns", async () => {
    const { client, batchRequests } = createBootstrapClient();

    await bootstrapSheetStructure(client);

    const addTable = batchRequests.find((request) => "addTable" in request)?.addTable as
      { table?: Record<string, unknown> } | undefined;

    expect(addTable?.table).toEqual(
      expect.objectContaining({
        tableId: REGISTRATIONS_TABLE_ID,
        name: REGISTRATIONS_TABLE_NAME,
        range: expect.objectContaining({
          startRowIndex: 0,
          startColumnIndex: 0,
          endColumnIndex: REGISTRATION_HEADERS.length,
        }),
        columnProperties: expect.arrayContaining([
          expect.objectContaining({ columnName: "BIRTH_DATE", columnType: "DATE" }),
          expect.objectContaining({ columnName: "STATUS", columnType: "DROPDOWN" }),
        ]),
      }),
    );
  });

  it("updates stale registration protections instead of duplicating them", async () => {
    const existing: readonly ProtectedRangeMetadata[] = [
      {
        protectedRangeId: 101,
        description: "activity-registration:system-columns:identity-and-pii",
        warningOnly: true,
        startColumnIndex: 0,
        endColumnIndex: 14,
      },
      {
        protectedRangeId: 102,
        description: "activity-registration:system-columns:metadata",
        warningOnly: true,
        startColumnIndex: 16,
        endColumnIndex: 21,
      },
    ];
    const { client, batchRequests } = createBootstrapClient(existing);

    await bootstrapSheetStructure(client);

    expect(batchRequests.filter((request) => "updateProtectedRange" in request)).toHaveLength(2);
  });
});
