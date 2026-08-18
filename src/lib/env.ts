import { z } from "zod";

const oidcKeys = [
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
] as const;

const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(["test", "development", "production"]).default("development"),
    DATA_BACKEND: z.enum(["memory", "google-sheets"]).default("memory"),
    GOOGLE_SPREADSHEET_ID: z.string().trim().optional(),
    GCP_PROJECT_ID: z.string().trim().optional(),
    GCP_PROJECT_NUMBER: z.string().trim().optional(),
    GCP_SERVICE_ACCOUNT_EMAIL: z.string().trim().pipe(z.email()).optional(),
    GCP_WORKLOAD_IDENTITY_POOL_ID: z.string().trim().optional(),
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: z.string().trim().optional(),
    ALLOW_TEST_SEED: z.enum(["true", "false"]).default("false"),
    VERCEL: z.string().optional(),
    VERCEL_OIDC_TOKEN: z.string().optional(),
  })
  .superRefine((env, context) => {
    if (env.DATA_BACKEND === "google-sheets" && !env.GOOGLE_SPREADSHEET_ID) {
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_SPREADSHEET_ID"],
        message: "GOOGLE_SPREADSHEET_ID is required for google-sheets backend.",
      });
    }

    if (env.APP_ENV === "production" && env.DATA_BACKEND !== "google-sheets") {
      context.addIssue({
        code: "custom",
        path: ["DATA_BACKEND"],
        message: "Production must use the google-sheets backend.",
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
