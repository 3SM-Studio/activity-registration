import { afterEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/lib/env";

vi.mock("@/infrastructure/google/auth", () => ({
  getGoogleAccessToken: vi.fn(async () => "test-access-token"),
}));

import { GoogleSheetsClient } from "@/infrastructure/google/sheets-client";

const env: ServerEnv = {
  APP_ENV: "test",
  DATA_BACKEND: "google-sheets",
  GOOGLE_SPREADSHEET_ID: "sheet-id",
  EMAIL_PROVIDER: "disabled",
  ALLOW_TEST_SEED: "false",
};

const tableMetadataResponse = {
  sheets: [
    {
      properties: { sheetId: 7, title: "ZAPISY" },
      tables: [
        {
          tableId: "900001",
          name: "Rejestracje",
          range: {
            sheetId: 7,
            startRowIndex: 0,
            endRowIndex: 10,
            startColumnIndex: 0,
            endColumnIndex: 22,
          },
          columnProperties: [
            { columnName: "REGISTRATION_ID", columnType: "TEXT" },
            { columnIndex: 9, columnName: "BIRTH_DATE", columnType: "DATE" },
            {
              columnIndex: 15,
              columnName: "STATUS",
              columnType: "DROPDOWN",
              dataValidationRule: {
                condition: {
                  type: "ONE_OF_LIST",
                  values: [{ userEnteredValue: "NEW" }, { userEnteredValue: "IN_PROGRESS" }],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GoogleSheetsClient", () => {
  it("appends ordinary user values using RAW input mode", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ updates: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");
    await client.appendValues("USTAWIENIA!A:ZZ", [["KEY", "=1+1"]]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("valueInputOption=RAW"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("insertDataOption=INSERT_ROWS"),
      expect.any(Object),
    );
  });

  it("resolves the table sheet and appends through AppendCellsRequest", async () => {
    const calls: Array<Readonly<{ input: RequestInfo | URL; init?: RequestInit }>> = [];
    const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, ...(init ? { init } : {}) });

      const body = init?.method === "POST" ? { replies: [] } : tableMetadataResponse;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    vi.stubGlobal("fetch", fetchStub);

    const client = new GoogleSheetsClient(env, "sheet-id");
    await client.appendTableRow("900001", ["reg_1", 42, true]);

    expect(calls).toHaveLength(2);
    expect(String(calls[0]?.input)).toContain("fields=sheets");
    expect(calls[1]?.init).toEqual(expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      requests: [
        {
          appendCells: {
            sheetId: 7,
            tableId: "900001",
            rows: [
              {
                values: [
                  { userEnteredValue: { stringValue: "reg_1" } },
                  { userEnteredValue: { numberValue: 42 } },
                  { userEnteredValue: { boolValue: true } },
                ],
              },
            ],
            fields: "userEnteredValue",
          },
        },
      ],
    });
  });

  it("does not retry an ambiguous native table append failure", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify(tableMetadataResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "temporary" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");

    await expect(client.appendTableRow("900001", ["reg_1"])).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reads protection and native table metadata used by sheet validation", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            sheets: [
              {
                properties: { sheetId: 7, title: "ZAPISY" },
                protectedRanges: [
                  {
                    protectedRangeId: 12,
                    description: "activity-registration:system-columns:identity-and-pii",
                    warningOnly: true,
                    range: {
                      sheetId: 7,
                      startColumnIndex: 0,
                      endColumnIndex: 15,
                    },
                  },
                ],
                tables: tableMetadataResponse.sheets[0]?.tables,
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");
    const metadata = await client.getSheetMetadata();

    expect(metadata).toEqual([
      {
        sheetId: 7,
        title: "ZAPISY",
        protectedRanges: [
          {
            protectedRangeId: 12,
            description: "activity-registration:system-columns:identity-and-pii",
            warningOnly: true,
            startColumnIndex: 0,
            endColumnIndex: 15,
          },
        ],
        tables: [
          {
            tableId: "900001",
            name: "Rejestracje",
            startRowIndex: 0,
            endRowIndex: 10,
            startColumnIndex: 0,
            endColumnIndex: 22,
            columnProperties: [
              { columnIndex: 0, columnName: "REGISTRATION_ID", columnType: "TEXT" },
              { columnIndex: 9, columnName: "BIRTH_DATE", columnType: "DATE" },
              {
                columnIndex: 15,
                columnName: "STATUS",
                columnType: "DROPDOWN",
                dropdownValues: ["NEW", "IN_PROGRESS"],
              },
            ],
          },
        ],
        filterViews: [],
        conditionalFormats: [],
      },
    ]);
  });
});
