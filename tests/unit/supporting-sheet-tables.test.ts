import { describe, expect, it } from "vitest";

import {
  bootstrapSupportingSheetTables,
  validateSupportingSheetTables,
} from "@/infrastructure/google/supporting-sheet-tables";
import { SHEET, SHEET_SCHEMA } from "@/infrastructure/google/sheets-contracts";
import type { SheetMetadata, SheetsClient } from "@/infrastructure/google/sheets-client";

const SUPPORTING_TABLES = [
  { sheet: SHEET.cities, tableId: "900002", tableName: "Miasta" },
  { sheet: SHEET.seasons, tableId: "900003", tableName: "Sezony" },
  { sheet: SHEET.offerings, tableId: "900004", tableName: "OfertyZajec" },
  { sheet: SHEET.groups, tableId: "900005", tableName: "Grupy" },
  { sheet: SHEET.settings, tableId: "900006", tableName: "Ustawienia" },
] as const;

function createClient(metadata: readonly SheetMetadata[]) {
  const batchRequests: Record<string, unknown>[] = [];

  const client: SheetsClient = {
    async getValues(range) {
      const spec = SUPPORTING_TABLES.find((candidate) =>
        range.startsWith(`${candidate.sheet}!`),
      );
      return spec ? [SHEET_SCHEMA[spec.sheet]] : [];
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
  return SUPPORTING_TABLES.map(({ sheet }, index) => ({
    sheetId: index + 10,
    title: sheet,
  }));
}

describe("bootstrapSupportingSheetTables", () => {
  it("creates native tables for every supporting system sheet", async () => {
    const { client, batchRequests } = createClient(metadataWithoutTables());

    await bootstrapSupportingSheetTables(client);

    const tables = batchRequests.flatMap((request) => {
      const addTable = request.addTable as
        | { table?: Record<string, unknown> }
        | undefined;
      return addTable?.table ? [addTable.table] : [];
    });

    expect(tables).toHaveLength(SUPPORTING_TABLES.length);
    expect(tables.map((table) => table.tableId)).toEqual(
      SUPPORTING_TABLES.map(({ tableId }) => tableId),
    );
    expect(tables.map((table) => table.name)).toEqual(
      SUPPORTING_TABLES.map(({ tableName }) => tableName),
    );
    expect(
      tables.map((table) => (table.range as Record<string, number>).startRowIndex),
    ).toEqual(SUPPORTING_TABLES.map(() => 0));
    expect(
      tables.map((table) => (table.range as Record<string, number>).endRowIndex),
    ).toEqual(SUPPORTING_TABLES.map(() => 2));
    expect(
      tables.map((table) => (table.range as Record<string, number>).startColumnIndex),
    ).toEqual(SUPPORTING_TABLES.map(() => 0));
    expect(
      tables.map((table) => (table.range as Record<string, number>).endColumnIndex),
    ).toEqual(SUPPORTING_TABLES.map(({ sheet }) => SHEET_SCHEMA[sheet].length));
    expect(tables.every((table) => table.rowsProperties !== undefined)).toBe(true);
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
    const metadata: readonly SheetMetadata[] = SUPPORTING_TABLES.map(
      ({ sheet, tableId, tableName }, index) => ({
        sheetId: index + 10,
        title: sheet,
        tables: [
          {
            tableId,
            name: tableName,
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: SHEET_SCHEMA[sheet].length,
            columnProperties: [],
          },
        ],
      }),
    );
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
