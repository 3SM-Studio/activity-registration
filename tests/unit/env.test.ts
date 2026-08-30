import { describe, expect, it } from "vitest";

import {
  PRODUCTION_ADMIN_EMAIL,
  PRODUCTION_SERVICE_ACCOUNT_EMAIL,
  PRODUCTION_SPREADSHEET_ID,
  isUnconfiguredVercelPreview,
  isUnconfiguredVercelProduction,
  parseServerEnv,
} from "@/lib/env";

const emailProductionConfig = {
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Pozytywka <zapisy@pozytywka.example>",
  REGISTRATION_ADMIN_EMAILS: `${PRODUCTION_ADMIN_EMAIL}, zapisy@example.com`,
} as const;

const vercelWifConfig = {
  GCP_PROJECT_NUMBER: "123456789",
  GCP_SERVICE_ACCOUNT_EMAIL: "activity@example.iam.gserviceaccount.com",
  GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel",
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
} as const;

const productionWifConfig = {
  ...vercelWifConfig,
  GCP_SERVICE_ACCOUNT_EMAIL: PRODUCTION_SERVICE_ACCOUNT_EMAIL,
} as const;

const canonicalProductionConfig = {
  VERCEL_ENV: "production",
  APP_ENV: "production",
  DATA_BACKEND: "google-sheets",
  GOOGLE_SPREADSHEET_ID: PRODUCTION_SPREADSHEET_ID,
  VERCEL: "1",
  CRON_SECRET: "test-cron-secret-that-is-longer-than-32-chars",
  ...productionWifConfig,
  ...emailProductionConfig,
} as const;

const canonicalPreviewConfig = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "preview",
  APP_ENV: "test",
  DATA_BACKEND: "google-sheets",
  GOOGLE_SPREADSHEET_ID: "sheet-test",
  ...vercelWifConfig,
  ...emailProductionConfig,
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
        CRON_SECRET: "",
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
        GOOGLE_SPREADSHEET_ID: PRODUCTION_SPREADSHEET_ID,
      }),
    ).toThrow();
  });

  it("requires complete WIF config for preview Google Sheets on Vercel", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "test",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: "sheet-test",
        VERCEL: "1",
      }),
    ).toThrow();
  });

  it("requires complete WIF config for production Google Sheets on Vercel", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: PRODUCTION_SPREADSHEET_ID,
        VERCEL: "1",
        ...emailProductionConfig,
      }),
    ).toThrow();
  });

  it("accepts complete preview Vercel configuration", () => {
    expect(
      parseServerEnv({
        APP_ENV: "test",
        DATA_BACKEND: "google-sheets",
        GOOGLE_SPREADSHEET_ID: "sheet-test",
        VERCEL: "1",
        ...vercelWifConfig,
      }),
    ).toMatchObject({
      APP_ENV: "test",
      DATA_BACKEND: "google-sheets",
      EMAIL_PROVIDER: "disabled",
    });
  });

  it("accepts only the canonical production Vercel configuration", () => {
    expect(parseServerEnv(canonicalProductionConfig)).toMatchObject({
      APP_ENV: "production",
      DATA_BACKEND: "google-sheets",
      EMAIL_PROVIDER: "resend",
      GOOGLE_SPREADSHEET_ID: PRODUCTION_SPREADSHEET_ID,
      GCP_SERVICE_ACCOUNT_EMAIL: PRODUCTION_SERVICE_ACCOUNT_EMAIL,
      REGISTRATION_ADMIN_EMAILS: [PRODUCTION_ADMIN_EMAIL, "zapisy@example.com"],
      CRON_SECRET: canonicalProductionConfig.CRON_SECRET,
    });
  });

  it("rejects production without a strong cron secret", () => {
    expect(() =>
      parseServerEnv({
        ...canonicalProductionConfig,
        CRON_SECRET: undefined,
      }),
    ).toThrow();
    expect(() =>
      parseServerEnv({
        ...canonicalProductionConfig,
        CRON_SECRET: "too-short",
      }),
    ).toThrow();
  });

  it("rejects production pointed at the wrong Sheet or service account", () => {
    expect(() =>
      parseServerEnv({
        ...canonicalProductionConfig,
        GOOGLE_SPREADSHEET_ID: "sheet-wrong",
      }),
    ).toThrow();

    expect(() =>
      parseServerEnv({
        ...canonicalProductionConfig,
        GCP_SERVICE_ACCOUNT_EMAIL: "activity@example.iam.gserviceaccount.com",
      }),
    ).toThrow();
  });

  it("rejects the Resend testing domain in production", () => {
    expect(() =>
      parseServerEnv({
        ...canonicalProductionConfig,
        EMAIL_FROM: "Pozytywka <onboarding@resend.dev>",
      }),
    ).toThrow();
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

  it("detects an unconfigured Vercel production deployment", () => {
    expect(isUnconfiguredVercelProduction({ VERCEL_ENV: "production" })).toBe(true);
    expect(isUnconfiguredVercelProduction({ VERCEL_TARGET_ENV: "production" })).toBe(true);
  });

  it("accepts only a fully configured canonical production deployment", () => {
    expect(isUnconfiguredVercelProduction(canonicalProductionConfig)).toBe(false);
    expect(
      isUnconfiguredVercelProduction({
        ...canonicalProductionConfig,
        GOOGLE_SPREADSHEET_ID: "sheet-wrong",
      }),
    ).toBe(true);
    expect(
      isUnconfiguredVercelProduction({
        ...canonicalProductionConfig,
        GCP_SERVICE_ACCOUNT_EMAIL: "activity@example.iam.gserviceaccount.com",
      }),
    ).toBe(true);
    expect(
      isUnconfiguredVercelProduction({
        ...canonicalProductionConfig,
        CRON_SECRET: "",
      }),
    ).toBe(true);
  });

  it("does not apply the production guard outside Vercel Production", () => {
    expect(isUnconfiguredVercelProduction({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isUnconfiguredVercelProduction({})).toBe(false);
  });

  it("blocks Vercel Preview deployments from non-canonical branches", () => {
    expect(
      isUnconfiguredVercelPreview({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feature/example",
      }),
    ).toBe(true);
  });

  it("blocks the canonical preview branch when durable integrations are missing", () => {
    expect(
      isUnconfiguredVercelPreview({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "preview",
      }),
    ).toBe(true);
  });

  it("accepts only a fully configured canonical preview deployment", () => {
    expect(isUnconfiguredVercelPreview(canonicalPreviewConfig)).toBe(false);
    expect(
      isUnconfiguredVercelPreview({
        ...canonicalPreviewConfig,
        RESEND_API_KEY: "",
      }),
    ).toBe(true);
  });

  it("does not apply the preview guard outside Vercel Preview", () => {
    expect(isUnconfiguredVercelPreview({})).toBe(false);
    expect(
      isUnconfiguredVercelPreview({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toBe(false);
  });
});
