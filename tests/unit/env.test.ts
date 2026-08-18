import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env";

describe("server environment", () => {
  it("defaults local development to the memory backend", () => {
    expect(parseServerEnv({})).toMatchObject({
      APP_ENV: "development",
      DATA_BACKEND: "memory",
      ALLOW_TEST_SEED: "false",
    });
  });

  it("rejects production without Google Sheets", () => {
    expect(() => parseServerEnv({ APP_ENV: "production", DATA_BACKEND: "memory" })).toThrow();
  });

  it("requires complete WIF config for production running on Vercel", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: "sheet-prod",
        VERCEL: "1",
      }),
    ).toThrow();
  });

  it("accepts complete production Vercel configuration", () => {
    expect(
      parseServerEnv({
        APP_ENV: "production",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: "sheet-prod",
        VERCEL: "1",
        GCP_PROJECT_NUMBER: "123456789",
        GCP_SERVICE_ACCOUNT_EMAIL: "activity@example.iam.gserviceaccount.com",
        GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel",
        GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel-prod",
      }),
    ).toMatchObject({ APP_ENV: "production", DATA_BACKEND: "google-sheets" });
  });
});
