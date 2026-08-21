import {
  syncOperatorSheetSchema,
  validateSafeOperatorSheetExperience,
} from "../src/infrastructure/google/operator-sheet-runtime";
import {
  bootstrapSheetStructure,
  validateSheetStructure,
} from "../src/infrastructure/google/sheet-admin";
import {
  bootstrapSupportingSheetTables,
  validateSupportingSheetTables,
} from "../src/infrastructure/google/supporting-sheet-tables";
import { getServerEnv } from "../src/lib/env";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();
  const env = getServerEnv();
  const hardProtectionEditorEmails =
    env.APP_ENV === "production" && env.GCP_SERVICE_ACCOUNT_EMAIL
      ? [env.GCP_SERVICE_ACCOUNT_EMAIL]
      : undefined;

  console.info("Synchronizing structural Google Sheet schema...");
  await bootstrapSheetStructure(
    client,
    hardProtectionEditorEmails ? { hardProtectionEditorEmails } : {},
  );
  await bootstrapSupportingSheetTables(client);
  await syncOperatorSheetSchema(client);

  const report = await validateSheetStructure(client);
  await validateSupportingSheetTables(client);
  await validateSafeOperatorSheetExperience(client);

  console.info(
    JSON.stringify(
      {
        ok: true,
        sheets: report.sheets,
        cityCount: report.cityCount,
        offeringCount: report.offeringCount,
        nativeTables: "schema-synced",
        operatorExperience: "ready",
        protectionMode: hardProtectionEditorEmails ? "hard" : "warning-only-test",
        structuralMutations: true,
        warnings: report.warnings,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown schema sync error.");
  process.exitCode = 1;
});
