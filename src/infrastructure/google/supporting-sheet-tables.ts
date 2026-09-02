import { SheetSchemaError } from "@/infrastructure/google/header-map";
import { SHEET, SHEET_SCHEMA } from "@/infrastructure/google/sheets-contracts";
import type {
  SheetMetadata,
  SheetsClient,
  TableMetadata,
} from "@/infrastructure/google/sheets-client";

const SUPPORTING_TABLE_SPECS = [
  {
    sheet: SHEET.cities,
    tableId: "900002",
    tableName: "Miasta",
  },
  {
    sheet: SHEET.seasons,
    tableId: "900003",
    tableName: "Sezony",
  },
  {
    sheet: SHEET.offerings,
    tableId: "900004",
    tableName: "OfertyZajec",
  },
  {
    sheet: SHEET.groups,
    tableId: "900005",
    tableName: "Grupy",
  },
  {
    sheet: SHEET.settings,
    tableId: "900006",
    tableName: "Ustawienia",
  },
] as const;

const SUPPORTING_TABLE_ROWS_PROPERTIES = {
  headerColorStyle: { rgbColor: { red: 0.188, green: 0.122, blue: 0.188 } },
  firstBandColorStyle: { rgbColor: { red: 1, green: 0.988, blue: 0.969 } },
  secondBandColorStyle: { rgbColor: { red: 1, green: 0.973, blue: 0.949 } },
} as const;

function tableRange(sheetId: number, rowCount: number, columnCount: number) {
  return {
    sheetId,
    startRowIndex: 0,
    endRowIndex: Math.max(rowCount, 2),
    startColumnIndex: 0,
    endColumnIndex: columnCount,
  } as const;
}

function findTableById(metadata: readonly SheetMetadata[], tableId: string) {
  for (const sheet of metadata) {
    const table = (sheet.tables ?? []).find((candidate) => candidate.tableId === tableId);
    if (table) {
      return { sheet, table } as const;
    }
  }

  return null;
}

function findTableByName(metadata: readonly SheetMetadata[], tableName: string) {
  for (const sheet of metadata) {
    const table = (sheet.tables ?? []).find((candidate) => candidate.name === tableName);
    if (table) {
      return { sheet, table } as const;
    }
  }

  return null;
}

function assertTableRange(
  table: TableMetadata | undefined,
  spec: (typeof SUPPORTING_TABLE_SPECS)[number],
  populatedRowCount: number,
): void {
  if (!table) {
    throw new SheetSchemaError(
      `Missing native ${spec.sheet} table ${spec.tableName}. Run sheet:bootstrap.`,
    );
  }

  const expectedColumnCount = SHEET_SCHEMA[spec.sheet].length;
  const minimumEndRowIndex = Math.max(populatedRowCount, 2);
  if (
    table.name !== spec.tableName ||
    table.startRowIndex !== 0 ||
    table.startColumnIndex !== 0 ||
    table.endColumnIndex !== expectedColumnCount ||
    table.endRowIndex === undefined ||
    table.endRowIndex < minimumEndRowIndex
  ) {
    throw new SheetSchemaError(
      `Native ${spec.sheet} table ${spec.tableName} has an invalid range or name.`,
    );
  }
}

export async function bootstrapSupportingSheetTables(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();

  for (const spec of SUPPORTING_TABLE_SPECS) {
    const sheet = metadata.find((candidate) => candidate.title === spec.sheet);
    if (!sheet) {
      throw new SheetSchemaError(`Missing ${spec.sheet} sheet. Run sheet:bootstrap first.`);
    }

    const rows = await client.getValues(`${spec.sheet}!A:ZZ`);
    const definition = {
      tableId: spec.tableId,
      name: spec.tableName,
      range: tableRange(sheet.sheetId, rows.length, SHEET_SCHEMA[spec.sheet].length),
      rowsProperties: SUPPORTING_TABLE_ROWS_PROPERTIES,
    } as const;

    const byId = findTableById(metadata, spec.tableId);
    if (byId && byId.sheet.sheetId !== sheet.sheetId) {
      throw new SheetSchemaError(
        `Native table ID ${spec.tableId} is already used on ${byId.sheet.title}.`,
      );
    }

    const byName = findTableByName(metadata, spec.tableName);
    if (byName && byName.sheet.sheetId !== sheet.sheetId) {
      throw new SheetSchemaError(
        `Native table name ${spec.tableName} is already used on ${byName.sheet.title}.`,
      );
    }

    const existing = (sheet.tables ?? []).find((candidate) => candidate.tableId === spec.tableId);
    if (!existing) {
      if (byName) {
        throw new SheetSchemaError(
          `${spec.sheet} table name ${spec.tableName} exists with an unexpected table ID.`,
        );
      }

      await client.batchUpdate([{ addTable: { table: definition } }]);
      continue;
    }

    await client.batchUpdate([
      {
        updateTable: {
          table: definition,
          fields: "name,range,rowsProperties",
        },
      },
    ]);
  }
}

export async function validateSupportingSheetTables(client: SheetsClient): Promise<void> {
  const metadata = await client.getSheetMetadata();

  for (const spec of SUPPORTING_TABLE_SPECS) {
    const sheet = metadata.find((candidate) => candidate.title === spec.sheet);
    if (!sheet) {
      throw new SheetSchemaError(`Missing ${spec.sheet} sheet.`);
    }

    const rows = await client.getValues(`${spec.sheet}!A:ZZ`);
    assertTableRange(
      (sheet.tables ?? []).find((candidate) => candidate.tableId === spec.tableId),
      spec,
      rows.length,
    );
  }
}
