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

type SpreadsheetMetadata = Readonly<{
  sheets?: readonly {
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }[];
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
  getSheetMetadata(): Promise<readonly { readonly sheetId: number; readonly title: string }[]>;
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

  async getSheetMetadata(): Promise<
    readonly { readonly sheetId: number; readonly title: string }[]
  > {
    const data = await this.request<SpreadsheetMetadata>(
      "?fields=sheets.properties(sheetId,title)",
    );

    return (data.sheets ?? []).flatMap((sheet) => {
      const sheetId = sheet.properties?.sheetId;
      const title = sheet.properties?.title;
      return typeof sheetId === "number" && title ? [{ sheetId, title }] : [];
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
