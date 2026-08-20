import { parseServerEnv } from "../src/lib/env";

const REQUIRED_PRODUCTION_KEYS = [
  "GOOGLE_SPREADSHEET_ID",
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "REGISTRATION_ADMIN_EMAILS",
] as const;

const MISSING_ENV_PREFIX = "Missing required production environment variables:";
const INVALID_ENV_PREFIX = "Production environment is not release-ready:";
const VALIDATION_FAILED_MESSAGE = "Production environment validation failed.";

function missingRequiredKeys(raw: NodeJS.ProcessEnv): string[] {
  return REQUIRED_PRODUCTION_KEYS.filter((key) => !raw[key]?.trim());
}

function main(): void {
  const missing = missingRequiredKeys(process.env);

  if (missing.length > 0) {
    const details = missing.join(", ");
    throw new Error(`${MISSING_ENV_PREFIX} ${details}`);
  }

  const env = parseServerEnv({
    ...process.env,
    VERCEL: process.env.VERCEL ?? "1",
  });

  const problems: string[] = [];

  if (env.APP_ENV !== "production") {
    problems.push("APP_ENV must be production");
  }

  if (env.DATA_BACKEND !== "google-sheets") {
    problems.push("DATA_BACKEND must be google-sheets");
  }

  if (env.EMAIL_PROVIDER !== "resend") {
    problems.push("EMAIL_PROVIDER must be resend");
  }

  if (env.ALLOW_TEST_SEED !== "false") {
    problems.push("ALLOW_TEST_SEED must be false");
  }

  if (problems.length > 0) {
    const details = problems.join("; ");
    throw new Error(`${INVALID_ENV_PREFIX} ${details}`);
  }

  const wifConfigured = Boolean(
    env.GCP_PROJECT_NUMBER &&
      env.GCP_SERVICE_ACCOUNT_EMAIL &&
      env.GCP_WORKLOAD_IDENTITY_POOL_ID &&
      env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  );

  console.info(
    JSON.stringify(
      {
        ok: true,
        appEnv: env.APP_ENV,
        dataBackend: env.DATA_BACKEND,
        emailProvider: env.EMAIL_PROVIDER,
        adminRecipientCount: env.REGISTRATION_ADMIN_EMAILS.length,
        spreadsheetConfigured: Boolean(env.GOOGLE_SPREADSHEET_ID),
        wifConfigured,
        testSeedDisabled: env.ALLOW_TEST_SEED === "false",
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : VALIDATION_FAILED_MESSAGE;
  console.error(message);
  process.exitCode = 1;
}
