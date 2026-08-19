import type { ServerEnv } from "@/lib/env";
import { withRetry } from "@/lib/retry";
import { getGoogleAccessToken } from "@/infrastructure/google/auth";

const SHEETS_API_ROOT = "https://sheets.googleapis.com/v4/spreadsheets";

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
  }[];
}>;

export type ProtectedRangeMetadata = Readonly<{
  protectedRangeId: number;
  description: string;
  warningOnly: boolean;
  startColumnIndex?: number;
  endColumnIndex?: number;
}>;

export type SheetMetadata = Readonly<{
  sheetId: number;
  title: string;
  protectedRanges?: readonly ProtectedRangeMetadata[];
}>;

function isRetryableSheetsError(error: unknown): boolean {
  return error instanceof SheetsApiError && [429, 500, 502, 503, 504].includes(error.status);
}

export interface SheetsClient {
  getValues(range: string): Promise<readonly (readonly unknown[])[]>;
  updateValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void>;
  appendValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void>;
  clearValues(range: string): Promise<void>;
  getSheetMetadata(): Promise<readonly SheetMetadata[]>;
  batchUpdate(requests: readonly Record<string, unknown>[]): Promise<void>;
}

export class GoogleSheetsClient implements SheetsClient {
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

      const response = await fetch(`${SHEETS_API_ROOT}/${this.spreadsheetId}${path}`, {
        ...init,
        headers,
      });

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

  async getValues(range: string): Promise<readonly (readonly unknown[])[]> {
    const response = await this.request<ValuesResponse>(
      `/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
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
      `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
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

  async clearValues(range: string): Promise<void> {
    await this.request(`/values/${encodeURIComponent(range)}:clear`, {
      method: "POST",
      body: "{}",
    });
  }

  async getSheetMetadata(): Promise<readonly SheetMetadata[]> {
    const data = await this.request<SpreadsheetMetadataResponse>(
      "?fields=sheets(properties(sheetId,title),protectedRanges(protectedRangeId,description,warningOnly,range(sheetId,startColumnIndex,endColumnIndex)))",
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

      return [{ sheetId, title, protectedRanges } satisfies SheetMetadata];
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
