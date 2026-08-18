import { z } from "zod";

const oidcKeys = [
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
] as const;

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? undefined : value;
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

    if (env.APP_ENV === "production" && env.DATA_BACKEND !== "google-sheets") {
      context.addIssue({
        code: "custom",
        path: ["DATA_BACKEND"],
        message: "Production must use the google-sheets backend.",
      });
    }

    if (env.APP_ENV === "production" && env.EMAIL_PROVIDER !== "resend") {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "Production must use the Resend email provider.",
      });
    }

    if (env.APP_ENV === "production" && env.VERCEL) {
      for (const key of oidcKeys) {
        if (!env[key]) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required for Vercel production OIDC.`,
          });
        }
      }
    }
  });

export type ServerEnv = z.output<typeof serverEnvSchema>;

export function parseServerEnv(input: unknown): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
