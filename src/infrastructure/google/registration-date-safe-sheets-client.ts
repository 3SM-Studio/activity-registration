import { googleSerialToIsoDate } from "@/infrastructure/google/google-date";
import { REGISTRATION_HEADERS, SHEET } from "@/infrastructure/google/sheets-contracts";
import type {
  SheetMetadata,
  SheetsClient,
  ValueRenderOption,
} from "@/infrastructure/google/sheets-client";

const DATE_HEADERS = new Set(["BIRTH_DATE", "CONTACTED_AT", "CONFIRMED_AT", "CLOSED_AT"]);

function asHeaderRow(row: readonly unknown[]): readonly string[] | null {
  const headers = row.map((value) => String(value ?? ""));
  const available = new Set(headers);

  return REGISTRATION_HEADERS.every((header) => available.has(header)) ? headers : null;
}

/**
 * Google Sheets native Table append accepts an ISO date string in a DATE column
 * and converts it to the native serial value while preserving the DATE format.
 *
 * The registration repository deliberately uses numeric Google serials internally
 * so reads round-trip independent of cell rendering. This adapter changes only the
 * outbound registration DATE cells to ISO strings immediately before an append.
 * It keeps the rest of the Sheets client behaviour, retries and native-table
 * fallback unchanged.
 */
export class RegistrationDateSafeSheetsClient implements SheetsClient {
  private registrationHeaders: readonly string[] | null = null;

  constructor(private readonly inner: SheetsClient) {}

  private rememberRegistrationHeaders(range: string, rows: readonly (readonly unknown[])[]): void {
    if (!range.startsWith(`${SHEET.registrations}!`)) {
      return;
    }

    const headers = asHeaderRow(rows[0] ?? []);
    if (headers) {
      this.registrationHeaders = headers;
    }
  }

  private appendSafeRow(
    row: readonly (string | number | boolean)[],
  ): readonly (string | number | boolean)[] {
    if (!this.registrationHeaders) {
      throw new Error("Registration headers must be read before appending a registration row.");
    }

    return row.map((value, index) => {
      const header = this.registrationHeaders?.[index];
      if (!header || !DATE_HEADERS.has(header) || typeof value !== "number") {
        return value;
      }

      return googleSerialToIsoDate(value);
    });
  }

  async getValues(
    range: string,
    options: Readonly<{ valueRenderOption?: ValueRenderOption }> = {},
  ): Promise<readonly (readonly unknown[])[]> {
    const rows = await this.inner.getValues(range, options);
    this.rememberRegistrationHeaders(range, rows);
    return rows;
  }

  updateValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void> {
    return this.inner.updateValues(range, values);
  }

  async appendValues(
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void> {
    await this.inner.appendValues(
      range,
      values.map((row) => this.appendSafeRow(row)),
    );
  }

  async appendTableRow(
    tableId: string,
    row: readonly (string | number | boolean)[],
  ): Promise<void> {
    await this.inner.appendTableRow(tableId, this.appendSafeRow(row));
  }

  clearValues(range: string): Promise<void> {
    return this.inner.clearValues(range);
  }

  getSheetMetadata(): Promise<readonly SheetMetadata[]> {
    return this.inner.getSheetMetadata();
  }

  batchUpdate(requests: readonly Record<string, unknown>[]): Promise<void> {
    return this.inner.batchUpdate(requests);
  }
}
