import { describe, expect, it } from "vitest";

import { isoDateToGoogleSerial } from "@/infrastructure/google/google-date";
import { RegistrationDateSafeSheetsClient } from "@/infrastructure/google/registration-date-safe-sheets-client";
import { REGISTRATION_HEADERS } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

function createInner() {
  const appendedTableRows: (readonly (string | number | boolean)[])[] = [];
  const appendedValueRows: (readonly (string | number | boolean)[])[] = [];
  const header = [...REGISTRATION_HEADERS].reverse();

  const client: SheetsClient = {
    async getValues() {
      return [header];
    },
    async updateValues() {},
    async appendValues(_range, values) {
      appendedValueRows.push(...values);
    },
    async appendTableRow(_tableId, row) {
      appendedTableRows.push(row);
    },
    async clearValues() {},
    async getSheetMetadata() {
      return [];
    },
    async batchUpdate() {},
  };

  return { client, header, appendedTableRows, appendedValueRows };
}

function registrationRow(headers: readonly string[]) {
  return headers.map((header) => {
    switch (header) {
      case "BIRTH_DATE":
        return isoDateToGoogleSerial("2017-04-22");
      case "CONTACTED_AT":
        return isoDateToGoogleSerial("2026-09-13");
      case "AGE_AT_SUBMISSION":
        return 9;
      case "SCHEMA_VERSION":
        return 4;
      default:
        return "";
    }
  });
}

describe("RegistrationDateSafeSheetsClient", () => {
  it("converts only registration DATE serials to ISO before native table append", async () => {
    const { client, header, appendedTableRows } = createInner();
    const safe = new RegistrationDateSafeSheetsClient(client);
    await safe.getValues("ZAPISY!A1:AC1");

    await safe.appendTableRow("900001", registrationRow(header));

    const appended = appendedTableRows[0]!;
    expect(appended[header.indexOf("BIRTH_DATE")]).toBe("2017-04-22");
    expect(appended[header.indexOf("CONTACTED_AT")]).toBe("2026-09-13");
    expect(appended[header.indexOf("AGE_AT_SUBMISSION")]).toBe(9);
    expect(appended[header.indexOf("SCHEMA_VERSION")]).toBe(4);
  });

  it("applies the same conversion to the values.append fallback", async () => {
    const { client, header, appendedValueRows } = createInner();
    const safe = new RegistrationDateSafeSheetsClient(client);
    await safe.getValues("ZAPISY!A1:AC1");

    await safe.appendValues("ZAPISY!A:AC", [registrationRow(header)]);

    const appended = appendedValueRows[0]!;
    expect(appended[header.indexOf("BIRTH_DATE")]).toBe("2017-04-22");
    expect(appended[header.indexOf("CONTACTED_AT")]).toBe("2026-09-13");
  });

  it("fails closed if a registration append happens without a validated header read", async () => {
    const { client } = createInner();
    const safe = new RegistrationDateSafeSheetsClient(client);

    await expect(safe.appendTableRow("900001", ["reg"])).rejects.toThrow(
      "Registration headers must be read before appending a registration row.",
    );
  });
});
