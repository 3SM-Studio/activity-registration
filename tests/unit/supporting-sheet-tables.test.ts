import { describe, expect, it } from "vitest";

import {
  bootstrapSupportingSheetTables,
  validateSupportingSheetTables,
} from "@/infrastructure/google/supporting-sheet-tables";
import { SHEET, SHEET_SCHEMA } from "@/infrastructure/google/sheets-contracts";
import type { SheetMetadata, SheetsClient } from "@/infrastructure/google/sheets-client";

const SUPPORTING_SHEETS = [
  SHEET.cities,
  SHEET.seasons,
  SHEET.offerings,
  SHEET.groups,
  SHEET.settings,
] as const;

const TABLE_IDS = ["900002", "900003", "900004", "900005", "900006"] as const;
const TABLE_NAMES = ["Miasta", "Sezony", "OfertyZajec", "Grupy", "Ustawienia"] as const;

function createClient(metadata: readonly SheetMetadata[]) {
  const batchRequests: Record<string, unknown>[] = [];

  const client: SheetsClient = {
    async getValues(range) {
      const sheet = SUPPORTING_SHEETS.find((candidate) => range.startsWith(`${candidate}!`));
      return sheet ? [SHEET_SCHEMA[sheet]] : [];
    },
    async updateValues() {},
    async appendValues() {},
    async appendTableRow() {},
    async clearValues() {},
    async getSheetMetadata() {
      return metadata;
    },
    async batchUpdate(requests) {
      batchRequests.push(...requests);
    },
  };

  return { client, batchRequests };
}

function metadataWithoutTables(): readonly SheetMetadata[] {
  return SUPPORTING_SHEETS.map((title, index) => ({
    sheetId: index + 10,
    title,
  }));
}

describe("bootstrapSupportingSheetTables", () => {
  it("creates native tables for every supporting system sheet", async () => {
    const { client, batchRequests } = createClient(metadataWithoutTables());

    await bootstrapSupportingSheetTables(client);

    const tables = batchRequests.flatMap((request) => {
      const addTable = request.addTable as { table?: Record<string, unknown> } | undefined;
      return addTable?.table ? [addTable.table] : [];
    });

    expect(tables).toHaveLength(SUPPORTING_SHEETS.length);
    expect(tables.map((table) => table.tableId)).toEqual(TABLE_IDS);
    expect(tables.map((table) => table.name)).toEqual(TABLE_NAMES);

    for (const [index, table] of tables.entries()) {
      const range = table.range as Record<string, number>;
      expect(range.startRowIndex).toBe(0);
      expect(range.endRowIndex).toBe(2);
      expect(range.startColumnIndex).toBe(0);
      expect(range.endColumnIndex).toBe(SHEET_SCHEMA[SUPPORTING_SHEETS[index]].length);
      expect(table.rowsProperties).toBeDefined();
    }
  });

  it("updates an existing managed table instead of adding a duplicate", async () => {
    const metadata: readonly SheetMetadata[] = metadataWithoutTables().map((sheet) =>
      sheet.title === SHEET.cities
        ? {
            ...sheet,
            tables: [
              {
                tableId: "900002",
                name: "Miasta",
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: SHEET_SCHEMA[SHEET.cities].length,
                columnProperties: [],
              },
            ],
          }
        : sheet,
    );
    const { client, batchRequests } = createClient(metadata);

    await bootstrapSupportingSheetTables(client);

    expect(batchRequests.filter((request) => "updateTable" in request)).toHaveLength(1);
    expect(batchRequests.filter((request) => "addTable" in request)).toHaveLength(4);
  });
});

describe("validateSupportingSheetTables", () => {
  it("accepts the expected native table contract on every supporting sheet", async () => {
    const metadata: readonly SheetMetadata[] = SUPPORTING_SHEETS.map((title, index) => ({
      sheetId: index + 10,
      title,
      tables: [
        {
          tableId: TABLE_IDS[index],
          name: TABLE_NAMES[index],
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: SHEET_SCHEMA[title].length,
          columnProperties: [],
        },
      ],
    }));
    const { client } = createClient(metadata);

    await expect(validateSupportingSheetTables(client)).resolves.toBeUndefined();
  });

  it("rejects a sheet that is missing its managed native table", async () => {
    const { client } = createClient(metadataWithoutTables());

    await expect(validateSupportingSheetTables(client)).rejects.toThrow(
      "Missing native MIASTA table Miasta",
    );
  });
});
