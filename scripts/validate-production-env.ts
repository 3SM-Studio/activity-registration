import {
  PRODUCTION_ADMIN_EMAIL,
  PRODUCTION_SERVICE_ACCOUNT_EMAIL,
  PRODUCTION_SPREADSHEET_ID,
  parseServerEnv,
} from "../src/lib/env";

const REQUIRED_PRODUCTION_KEYS = [
  "GOOGLE_SPREADSHEET_ID",
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "REGISTRATION_ADMIN_EMAILS",
  "CRON_SECRET",
] as const;

const MISSING_ENV_PREFIX = "Missing required production environment variables:";
const INVALID_ENV_PREFIX = "Production environment is not release-ready:";
const VALIDATION_FAILED_MESSAGE = "Production environment validation failed.";

function missingRequiredKeys(raw: NodeJS.ProcessEnv): string[] {
  return REQUIRED_PRODUCTION_KEYS.filter((key) => !raw[key]?.trim());
}

function usesResendTestingDomain(value: string | undefined): boolean {
  return value?.toLowerCase().includes("@resend.dev") ?? false;
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

  if (process.env.ALLOW_PRODUCTION_CATALOG_SEED === "true") {
    problems.push("ALLOW_PRODUCTION_CATALOG_SEED must not be true during normal runtime");
  }

  if (env.GOOGLE_SPREADSHEET_ID !== PRODUCTION_SPREADSHEET_ID) {
    problems.push("GOOGLE_SPREADSHEET_ID must point to the canonical PROD Sheet");
  }

  if (env.GCP_SERVICE_ACCOUNT_EMAIL !== PRODUCTION_SERVICE_ACCOUNT_EMAIL) {
    problems.push("GCP_SERVICE_ACCOUNT_EMAIL must be the dedicated PROD service account");
  }

  if (usesResendTestingDomain(env.EMAIL_FROM)) {
    problems.push("EMAIL_FROM must not use the resend.dev testing domain");
  }

  if (!env.REGISTRATION_ADMIN_EMAILS?.includes(PRODUCTION_ADMIN_EMAIL)) {
    problems.push(`REGISTRATION_ADMIN_EMAILS must include ${PRODUCTION_ADMIN_EMAIL}`);
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
  const adminRecipientCount = env.REGISTRATION_ADMIN_EMAILS?.length ?? 0;

  console.info(
    JSON.stringify(
      {
        ok: true,
        appEnv: env.APP_ENV,
        dataBackend: env.DATA_BACKEND,
        emailProvider: env.EMAIL_PROVIDER,
        adminRecipientCount,
        canonicalSpreadsheet: env.GOOGLE_SPREADSHEET_ID === PRODUCTION_SPREADSHEET_ID,
        dedicatedProdIdentity: env.GCP_SERVICE_ACCOUNT_EMAIL === PRODUCTION_SERVICE_ACCOUNT_EMAIL,
        wifConfigured,
        cronSecretConfigured: Boolean(env.CRON_SECRET),
        testSeedDisabled: env.ALLOW_TEST_SEED === "false",
        productionCatalogSeedDisabled: process.env.ALLOW_PRODUCTION_CATALOG_SEED !== "true",
        resendTestingDomainRejected: !usesResendTestingDomain(env.EMAIL_FROM),
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
