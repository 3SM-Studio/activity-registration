import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env";

const emailProductionConfig = {
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Pozytywka <zapisy@example.com>",
  REGISTRATION_ADMIN_EMAILS: "biuro@example.com, zapisy@example.com",
} as const;

describe("server environment", () => {
  it("defaults local development to memory with email disabled", () => {
    expect(parseServerEnv({})).toMatchObject({
      APP_ENV: "development",
      DATA_BACKEND: "memory",
      EMAIL_PROVIDER: "disabled",
      ALLOW_TEST_SEED: "false",
    });
  });

  it("treats empty optional values as unset", () => {
    expect(
      parseServerEnv({
        APP_ENV: "test",
        DATA_BACKEND: "memory",
        GOOGLE_SPREADSHEET_ID: "",
        GCP_PROJECT_ID: "",
        GCP_PROJECT_NUMBER: "",
        GCP_SERVICE_ACCOUNT_EMAIL: "",
        GCP_WORKLOAD_IDENTITY_POOL_ID: "",
        GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "",
        EMAIL_PROVIDER: "disabled",
        RESEND_API_KEY: "",
        EMAIL_FROM: "",
        REGISTRATION_ADMIN_EMAILS: "",
        VERCEL: "",
        VERCEL_OIDC_TOKEN: "",
      }),
    ).toMatchObject({
      APP_ENV: "test",
      DATA_BACKEND: "memory",
      EMAIL_PROVIDER: "disabled",
    });
  });

  it("rejects production without Google Sheets", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        DATA_BACKEND: "memory",
        ...emailProductionConfig,
      }),
    ).toThrow();
  });

  it("rejects production with email notifications disabled", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: "sheet-prod",
      }),
    ).toThrow();
  });

  it("requires complete WIF config for production running on Vercel", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: "sheet-prod",
        VERCEL: "1",
        ...emailProductionConfig,
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
        ...emailProductionConfig,
      }),
    ).toMatchObject({
      APP_ENV: "production",
      DATA_BACKEND: "google-sheets",
      EMAIL_PROVIDER: "resend",
      REGISTRATION_ADMIN_EMAILS: ["biuro@example.com", "zapisy@example.com"],
    });
  });

  it("rejects an invalid admin email list", () => {
    expect(() =>
      parseServerEnv({
        EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "Pozytywka <zapisy@example.com>",
        REGISTRATION_ADMIN_EMAILS: "not-an-email",
      }),
    ).toThrow();
  });
});
