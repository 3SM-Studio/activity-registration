import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleSheetsClient } from "@/infrastructure/google/sheets-client";
import type { ServerEnv } from "@/lib/env";

vi.mock("@/infrastructure/google/auth", () => ({
  getGoogleAccessToken: vi.fn(async () => "token"),
}));

const env = {
  APP_ENV: "test",
  GOOGLE_PROJECT_ID: "test-project",
  GOOGLE_PROJECT_NUMBER: "123456789",
  GOOGLE_WORKLOAD_IDENTITY_POOL_ID: "test-pool",
  GOOGLE_WORKLOAD_IDENTITY_PROVIDER_ID: "test-provider",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@example.iam.gserviceaccount.com",
  GOOGLE_SHEETS_TEST_ID: "test-sheet",
  GOOGLE_SHEETS_PROD_ID: "prod-sheet",
  REGISTRATION_SHEET_MODE: "test",
  EMAIL_PROVIDER: "disabled",
} as ServerEnv;

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
            {
              columnIndex: 9,
              columnName: "BIRTH_DATE",
              columnType: "DATE",
            },
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
  vi.clearAllMocks();
});

describe("GoogleSheetsClient", () => {
  it("appends ordinary user values using RAW input mode", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");
    await client.appendValues("ZAPISY!A:V", [["=2+2", "+48123123123"]]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("valueInputOption=RAW");
    expect(String(url)).toContain("insertDataOption=INSERT_ROWS");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      range: "ZAPISY!A:V",
      majorDimension: "ROWS",
      values: [["=2+2", "+48123123123"]],
    });
  });

  it("resolves the table sheet and appends through AppendCellsRequest", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return new Response(
        JSON.stringify(url.includes("?fields=") ? tableMetadataResponse : { replies: [{}] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");
    await client.appendTableRow("900001", ["abc", 12, true]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, appendInit] = fetchMock.mock.calls[1]!;
    expect(appendInit?.method).toBe("POST");
    expect(JSON.parse(String(appendInit?.body))).toEqual({
      requests: [
        {
          appendCells: {
            sheetId: 7,
            tableId: "900001",
            rows: [
              {
                values: [
                  { userEnteredValue: { stringValue: "abc" } },
                  { userEnteredValue: { numberValue: 12 } },
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
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("?fields=")) {
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
    await expect(client.appendTableRow("900001", ["abc"])).rejects.toMatchObject({
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
