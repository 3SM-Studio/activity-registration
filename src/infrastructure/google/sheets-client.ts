import type { ServerEnv } from "@/lib/env";
import { withRetry } from "@/lib/retry";
import { getGoogleAccessToken } from "@/infrastructure/google/auth";

const SHEETS_API_ROOT = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_REQUEST_TIMEOUT_MS = 6_000;
const HUMAN_DATE_PATTERN = "dd.mm.yyyy";

export class SheetsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SheetsApiError";
    this.status = status;
  }
}

type ValuesResponse = Readonly<{
  range?: string;
  majorDimension?: string;
  values?: readonly (readonly unknown[])[];
}>;

type AppendValuesResponse = Readonly<{
  tableRange?: string;
  updates?: Readonly<{
    updatedRange?: string;
    updatedRows?: number;
    updatedColumns?: number;
    updatedCells?: number;
  }>;
}>;

type GridRangeResponse = Readonly<{
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}>;

type SpreadsheetMetadataResponse = Readonly<{
  sheets?: readonly {
    properties?: {
      sheetId?: number;
      title?: string;
    };
    protectedRanges?: readonly {
      protectedRangeId?: number;
      description?: string;
      warningOnly?: boolean;
      range?: {
        sheetId?: number;
        startColumnIndex?: number;
        endColumnIndex?: number;
      };
    }[];
    tables?: readonly {
      tableId?: string;
      name?: string;
      range?: GridRangeResponse;
      columnProperties?: readonly {
        columnIndex?: number;
        columnName?: string;
        columnType?: string;
        dataValidationRule?: {
          condition?: {
            type?: string;
            values?: readonly { userEnteredValue?: string }[];
          };
        };
      }[];
    }[];
    filterViews?: readonly {
      filterViewId?: number;
      title?: string;
      range?: GridRangeResponse;
      criteria?: Readonly<Record<string, { hiddenValues?: readonly string[] }>>;
    }[];
    conditionalFormats?: readonly {
      ranges?: readonly GridRangeResponse[];
      booleanRule?: {
        condition?: {
          type?: string;
          values?: readonly { userEnteredValue?: string }[];
        };
      };
    }[];
  }[];
}>;

export type ProtectedRangeMetadata = Readonly<{
  protectedRangeId: number;
  description: string;
  warningOnly: boolean;
  startColumnIndex?: number;
  endColumnIndex?: number;
}>;

export type TableColumnMetadata = Readonly<{
  columnIndex: number;
  columnName: string;
  columnType: string;
  dropdownValues?: readonly string[];
}>;

export type TableMetadata = Readonly<{
  tableId: string;
  name: string;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
  columnProperties: readonly TableColumnMetadata[];
}>;

export type FilterViewMetadata = Readonly<{
  filterViewId: number;
  title: string;
}>;

export type ConditionalFormatMetadata = Readonly<{
  index: number;
  customFormula: string | null;
}>;

export type SheetMetadata = Readonly<{
  sheetId: number;
  title: string;
  protectedRanges?: readonly ProtectedRangeMetadata[];
  tables?: readonly TableMetadata[];
  filterViews?: readonly FilterViewMetadata[];
  conditionalFormats?: readonly ConditionalFormatMetadata[];
}>;

export type ValueRenderOption = "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";

type ResolvedTable = Readonly<{
  sheetId: number;
  sheetTitle: string;
  table: TableMetadata;
}>;

function isRetryableSheetsError(error: unknown): boolean {
  return error instanceof SheetsApiError && [429, 500, 502, 503, 504].includes(error.status);
}

function columnLabel(columnIndex: number): string {
  let remaining = columnIndex + 1;
  let label = "";

  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }

  return label;
}

function quoteSheetTitle(title: string): string {
  return `'${title.replaceAll("'", "''")}'`;
}

function appendedRowIndex(updatedRange: string | undefined): number | null {
  if (!updatedRange) {
    return null;
  }

  const normalized = updatedRange.replaceAll("$", "");
  const match = /![A-Z]+(\d+):[A-Z]+(\d+)$/i.exec(normalized);
  if (!match || match[1] !== match[2]) {
    return null;
  }

  const rowNumber = Number(match[1]);
  return Number.isInteger(rowNumber) && rowNumber > 0 ? rowNumber - 1 : null;
}

export interface SheetsClient {
  getValues(
    range: string,
    options?: Readonly<{ valueRenderOption?: ValueRenderOption }>,
  ): Promise<readonly (readonly unknown[])[]>;
  updateValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void>;
  appendValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void>;
  appendTableRow(tableId: string, row: readonly (string | number | boolean)[]): Promise<void>;
  clearValues(range: string): Promise<void>;
  getSheetMetadata(): Promise<readonly SheetMetadata[]>;
  batchUpdate(requests: readonly Record<string, unknown>[]): Promise<void>;
}

export class GoogleSheetsClient implements SheetsClient {
  private readonly resolvedTables = new Map<string, ResolvedTable>();

  constructor(
    private readonly env: ServerEnv,
    private readonly spreadsheetId: string,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const performRequest = async (): Promise<T> => {
      const accessToken = await getGoogleAccessToken(this.env);
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("Content-Type", "application/json");

      let response: Response;
      try {
        response = await fetch(`${SHEETS_API_ROOT}/${this.spreadsheetId}${path}`, {
          ...init,
          headers,
          signal: init.signal ?? AbortSignal.timeout(SHEETS_REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new SheetsApiError(503, "Google Sheets API request failed or timed out.");
      }

      if (!response.ok) {
        throw new SheetsApiError(
          response.status,
          `Google Sheets API request failed with status ${response.status}.`,
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    };

    return retry ? withRetry(() => performRequest(), isRetryableSheetsError) : performRequest();
  }

  async getValues(
    range: string,
    options: Readonly<{ valueRenderOption?: ValueRenderOption }> = {},
  ): Promise<readonly (readonly unknown[])[]> {
    const query = new URLSearchParams({ majorDimension: "ROWS" });
    if (options.valueRenderOption) {
      query.set("valueRenderOption", options.valueRenderOption);
    }

    const response = await this.request<ValuesResponse>(
      `/values/${encodeURIComponent(range)}?${query.toString()}`,
    );
    return response.values ?? [];
  }

  async updateValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void> {
    await this.request(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    });
  }

  async appendValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void> {
    await this.request(
      `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
      {
        method: "POST",
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values,
        }),
      },
      false,
    );
  }

  private async resolveTable(tableId: string): Promise<ResolvedTable> {
    const cached = this.resolvedTables.get(tableId);
    if (cached) {
      return cached;
    }

    const metadata = await this.getSheetMetadata();
    for (const sheet of metadata) {
      const table = (sheet.tables ?? []).find((candidate) => candidate.tableId === tableId);
      if (!table) {
        continue;
      }

      const resolved = {
        sheetId: sheet.sheetId,
        sheetTitle: sheet.title,
        table,
      } satisfies ResolvedTable;
      this.resolvedTables.set(tableId, resolved);
      return resolved;
    }

    throw new SheetsApiError(400, `Google Sheets table ${tableId} was not found.`);
  }

  async appendTableRow(
    tableId: string,
    row: readonly (string | number | boolean)[],
  ): Promise<void> {
    const resolved = await this.resolveTable(tableId);
    const startColumnIndex = resolved.table.startColumnIndex ?? 0;
    const endColumnIndex = resolved.table.endColumnIndex;

    if (
      typeof endColumnIndex !== "number" ||
      endColumnIndex <= startColumnIndex ||
      row.length !== endColumnIndex - startColumnIndex
    ) {
      throw new SheetsApiError(400, `Google Sheets table ${tableId} has an invalid append range.`);
    }

    const range = `${quoteSheetTitle(resolved.sheetTitle)}!${columnLabel(startColumnIndex)}:${columnLabel(endColumnIndex - 1)}`;
    const response = await this.request<AppendValuesResponse>(
      `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
      {
        method: "POST",
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values: [row],
        }),
      },
      false,
    );

    const rowIndex = appendedRowIndex(response.updates?.updatedRange);
    if (rowIndex === null) {
      throw new SheetsApiError(500, "Google Sheets append response did not identify the written row.");
    }

    const requests: Record<string, unknown>[] = [];
    const currentEndRowIndex = resolved.table.endRowIndex ?? resolved.table.startRowIndex ?? 0;
    if (rowIndex >= currentEndRowIndex) {
      requests.push({
        updateTable: {
          table: {
            tableId,
            range: {
              sheetId: resolved.sheetId,
              startRowIndex: resolved.table.startRowIndex ?? 0,
              endRowIndex: rowIndex + 1,
              startColumnIndex,
              endColumnIndex,
            },
          },
          fields: "range",
        },
      });
    }

    for (const column of resolved.table.columnProperties) {
      if (column.columnType !== "DATE") {
        continue;
      }

      const absoluteColumnIndex = startColumnIndex + column.columnIndex;
      requests.push({
        repeatCell: {
          range: {
            sheetId: resolved.sheetId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: absoluteColumnIndex,
            endColumnIndex: absoluteColumnIndex + 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "DATE", pattern: HUMAN_DATE_PATTERN },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      });
    }

    if (requests.length > 0) {
      await this.request(
        ":batchUpdate",
        {
          method: "POST",
          body: JSON.stringify({ requests }),
        },
        true,
      );
    }

    if (rowIndex >= currentEndRowIndex) {
      this.resolvedTables.set(tableId, {
        ...resolved,
        table: { ...resolved.table, endRowIndex: rowIndex + 1 },
      });
    }
  }

  async clearValues(range: string): Promise<void> {
    await this.request(`/values/${encodeURIComponent(range)}:clear`, {
      method: "POST",
      body: "{}",
    });
  }

  async getSheetMetadata(): Promise<readonly SheetMetadata[]> {
    const data = await this.request<SpreadsheetMetadataResponse>(
      "?fields=sheets(properties(sheetId,title),protectedRanges(protectedRangeId,description,warningOnly,range(sheetId,startColumnIndex,endColumnIndex)),tables(tableId,name,range(sheetId,startRowIndex,endRowIndex,startColumnIndex,endColumnIndex),columnProperties(columnIndex,columnName,columnType,dataValidationRule(condition(type,values(userEnteredValue))))),filterViews(filterViewId,title),conditionalFormats(booleanRule(condition(type,values(userEnteredValue)))))",
    );

    return (data.sheets ?? []).flatMap((sheet) => {
      const sheetId = sheet.properties?.sheetId;
      const title = sheet.properties?.title;
      if (typeof sheetId !== "number" || !title) {
        return [];
      }

      const protectedRanges = (sheet.protectedRanges ?? []).flatMap((range) => {
        const protectedRangeId = range.protectedRangeId;
        if (typeof protectedRangeId !== "number") {
          return [];
        }

        return [
          {
            protectedRangeId,
            description: range.description ?? "",
            warningOnly: Boolean(range.warningOnly),
            ...(typeof range.range?.startColumnIndex === "number"
              ? { startColumnIndex: range.range.startColumnIndex }
              : {}),
            ...(typeof range.range?.endColumnIndex === "number"
              ? { endColumnIndex: range.range.endColumnIndex }
              : {}),
          } satisfies ProtectedRangeMetadata,
        ];
      });

      const tables = (sheet.tables ?? []).flatMap((table) => {
        if (!table.tableId || !table.name) {
          return [];
        }

        const columnProperties = (table.columnProperties ?? []).flatMap((column, position) => {
          const columnIndex =
            typeof column.columnIndex === "number"
              ? column.columnIndex
              : position === 0
                ? 0
                : undefined;

          if (typeof columnIndex !== "number" || !column.columnName || !column.columnType) {
            return [];
          }

          const dropdownValues = (column.dataValidationRule?.condition?.values ?? []).flatMap(
            (value) => (value.userEnteredValue ? [value.userEnteredValue] : []),
          );

          return [
            {
              columnIndex,
              columnName: column.columnName,
              columnType: column.columnType,
              ...(dropdownValues.length > 0 ? { dropdownValues } : {}),
            } satisfies TableColumnMetadata,
          ];
        });

        return [
          {
            tableId: table.tableId,
            name: table.name,
            ...(typeof table.range?.startRowIndex === "number"
              ? { startRowIndex: table.range.startRowIndex }
              : {}),
            ...(typeof table.range?.endRowIndex === "number"
              ? { endRowIndex: table.range.endRowIndex }
              : {}),
            ...(typeof table.range?.startColumnIndex === "number"
              ? { startColumnIndex: table.range.startColumnIndex }
              : {}),
            ...(typeof table.range?.endColumnIndex === "number"
              ? { endColumnIndex: table.range.endColumnIndex }
              : {}),
            columnProperties,
          } satisfies TableMetadata,
        ];
      });

      const filterViews = (sheet.filterViews ?? []).flatMap((filterView) => {
        if (typeof filterView.filterViewId !== "number" || !filterView.title) {
          return [];
        }
        return [
          {
            filterViewId: filterView.filterViewId,
            title: filterView.title,
          } satisfies FilterViewMetadata,
        ];
      });

      const conditionalFormats = (sheet.conditionalFormats ?? []).map(
        (rule, index) =>
          ({
            index,
            customFormula:
              rule.booleanRule?.condition?.type === "CUSTOM_FORMULA"
                ? (rule.booleanRule.condition.values?.[0]?.userEnteredValue ?? null)
                : null,
          }) satisfies ConditionalFormatMetadata,
      );

      return [
        {
          sheetId,
          title,
          protectedRanges,
          tables,
          filterViews,
          conditionalFormats,
        } satisfies SheetMetadata,
      ];
    });
  }

  async batchUpdate(requests: readonly Record<string, unknown>[]): Promise<void> {
    if (requests.length === 0) {
      return;
    }

    await this.request(
      ":batchUpdate",
      {
        method: "POST",
        body: JSON.stringify({ requests }),
      },
      false,
    );
  }
}
