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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GoogleSheetsClient", () => {
  it("appends user values using RAW input mode", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ updates: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");
    await client.appendValues("ZAPISY!A:ZZ", [["=1+1", "@value"]]);

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

  it("does not retry an ambiguous append failure", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "temporary" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GoogleSheetsClient(env, "sheet-id");

    await expect(client.appendValues("ZAPISY!A:ZZ", [["req_1"]])).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads protected range metadata used by sheet validation", async () => {
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
                      endColumnIndex: 14,
                    },
                  },
                ],
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
            endColumnIndex: 14,
          },
        ],
      },
    ]);
  });
});
