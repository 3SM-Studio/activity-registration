import { z } from "zod";

export const CANONICAL_PREVIEW_BRANCH = "preview";
export const PRODUCTION_SPREADSHEET_ID = "1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM";
export const PRODUCTION_SERVICE_ACCOUNT_EMAIL =
  "activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com";
export const PRODUCTION_ADMIN_EMAIL = "michal.szwindowski@gmail.com";

const oidcKeys = [
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
] as const;

const canonicalPreviewRequiredKeys = [
  "GOOGLE_SPREADSHEET_ID",
  ...oidcKeys,
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "REGISTRATION_ADMIN_EMAILS",
] as const;

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? undefined : value;
}

function asEnvironmentRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function isVercelTarget(env: Record<string, unknown>, target: "preview" | "production"): boolean {
  return env.VERCEL_ENV === target || env.VERCEL_TARGET_ENV === target;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function usesResendTestingDomain(value: string | undefined): boolean {
  return value?.toLowerCase().includes("@resend.dev") ?? false;
}

const optionalTrimmedStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional(),
);
const optionalNonEmptyStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);
const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().pipe(z.email()).optional(),
);
const emailAddressSchema = z.string().trim().pipe(z.email());
const adminEmailsSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0),
    )
    .pipe(z.array(emailAddressSchema).min(1))
    .optional(),
);

const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(["test", "development", "production"]).default("development"),
    DATA_BACKEND: z.enum(["memory", "google-sheets"]).default("memory"),
    GOOGLE_SPREADSHEET_ID: optionalTrimmedStringSchema,
    GCP_PROJECT_ID: optionalTrimmedStringSchema,
    GCP_PROJECT_NUMBER: optionalTrimmedStringSchema,
    GCP_SERVICE_ACCOUNT_EMAIL: optionalEmailSchema,
    GCP_WORKLOAD_IDENTITY_POOL_ID: optionalTrimmedStringSchema,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: optionalTrimmedStringSchema,
    EMAIL_PROVIDER: z.enum(["disabled", "resend"]).default("disabled"),
    RESEND_API_KEY: optionalNonEmptyStringSchema,
    EMAIL_FROM: optionalNonEmptyStringSchema,
    REGISTRATION_ADMIN_EMAILS: adminEmailsSchema,
    ALLOW_TEST_SEED: z.enum(["true", "false"]).default("false"),
    VERCEL: optionalTrimmedStringSchema,
    VERCEL_OIDC_TOKEN: optionalTrimmedStringSchema,
  })
  .superRefine((env, context) => {
    if (env.DATA_BACKEND === "google-sheets" && !env.GOOGLE_SPREADSHEET_ID) {
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_SPREADSHEET_ID"],
        message: "GOOGLE_SPREADSHEET_ID is required for google-sheets backend.",
      });
    }

    if (env.DATA_BACKEND === "google-sheets" && (env.VERCEL || env.VERCEL_OIDC_TOKEN)) {
      for (const key of oidcKeys) {
        if (!env[key]) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required for Google Sheets on Vercel OIDC.`,
          });
        }
      }
    }

    if (env.EMAIL_PROVIDER === "resend") {
      if (!env.RESEND_API_KEY) {
        context.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required for Resend.",
        });
      }

      if (!env.EMAIL_FROM) {
        context.addIssue({
          code: "custom",
          path: ["EMAIL_FROM"],
          message: "EMAIL_FROM is required for Resend.",
        });
      }

      if (!env.REGISTRATION_ADMIN_EMAILS) {
        context.addIssue({
          code: "custom",
          path: ["REGISTRATION_ADMIN_EMAILS"],
          message: "REGISTRATION_ADMIN_EMAILS is required for Resend.",
        });
      }
    }

    if (env.APP_ENV === "production") {
      if (env.DATA_BACKEND !== "google-sheets") {
        context.addIssue({
          code: "custom",
          path: ["DATA_BACKEND"],
          message: "Production must use the google-sheets backend.",
        });
      }

      if (env.EMAIL_PROVIDER !== "resend") {
        context.addIssue({
          code: "custom",
          path: ["EMAIL_PROVIDER"],
          message: "Production must use the Resend email provider.",
        });
      }

      if (env.GOOGLE_SPREADSHEET_ID !== PRODUCTION_SPREADSHEET_ID) {
        context.addIssue({
          code: "custom",
          path: ["GOOGLE_SPREADSHEET_ID"],
          message: "Production must use the canonical PROD spreadsheet.",
        });
      }

      if (env.GCP_SERVICE_ACCOUNT_EMAIL !== PRODUCTION_SERVICE_ACCOUNT_EMAIL) {
        context.addIssue({
          code: "custom",
          path: ["GCP_SERVICE_ACCOUNT_EMAIL"],
          message: "Production must use the dedicated PROD service account.",
        });
      }

      if (usesResendTestingDomain(env.EMAIL_FROM)) {
        context.addIssue({
          code: "custom",
          path: ["EMAIL_FROM"],
          message: "Production EMAIL_FROM must use a verified production domain.",
        });
      }

      if (!env.REGISTRATION_ADMIN_EMAILS?.includes(PRODUCTION_ADMIN_EMAIL)) {
        context.addIssue({
          code: "custom",
          path: ["REGISTRATION_ADMIN_EMAILS"],
          message: "Production admin recipients must include the approved production admin mailbox.",
        });
      }
    }
  });

export type ServerEnv = z.output<typeof serverEnvSchema>;

export function isUnconfiguredVercelProduction(input: unknown = process.env): boolean {
  const env = asEnvironmentRecord(input);
  if (!env || !isVercelTarget(env, "production")) {
    return false;
  }

  if (
    env.APP_ENV !== "production" ||
    env.DATA_BACKEND !== "google-sheets" ||
    env.EMAIL_PROVIDER !== "resend" ||
    env.GOOGLE_SPREADSHEET_ID !== PRODUCTION_SPREADSHEET_ID ||
    env.GCP_SERVICE_ACCOUNT_EMAIL !== PRODUCTION_SERVICE_ACCOUNT_EMAIL
  ) {
    return true;
  }

  return [
    "GCP_PROJECT_NUMBER",
    "GCP_WORKLOAD_IDENTITY_POOL_ID",
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "REGISTRATION_ADMIN_EMAILS",
  ].some((key) => !hasNonEmptyString(env[key]));
}

export function isUnconfiguredVercelPreview(input: unknown = process.env): boolean {
  const env = asEnvironmentRecord(input);
  if (!env || !isVercelTarget(env, "preview")) {
    return false;
  }

  if (env.VERCEL_GIT_COMMIT_REF !== CANONICAL_PREVIEW_BRANCH) {
    return true;
  }

  if (
    env.APP_ENV !== "test" ||
    env.DATA_BACKEND !== "google-sheets" ||
    env.EMAIL_PROVIDER !== "resend"
  ) {
    return true;
  }

  return canonicalPreviewRequiredKeys.some((key) => !hasNonEmptyString(env[key]));
}

export function parseServerEnv(input: unknown): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
