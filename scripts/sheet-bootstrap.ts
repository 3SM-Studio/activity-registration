import {
  refreshOperatorSheetRuntime,
  validateSafeOperatorSheetExperience,
} from "../src/infrastructure/google/operator-sheet-runtime";
import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { validateSupportingSheetTables } from "../src/infrastructure/google/supporting-sheet-tables";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();

  console.info("Refreshing runtime-safe Google Sheet operator experience...");
  await refreshOperatorSheetRuntime(client);

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
        nativeTables: "validated-read-only",
        operatorExperience: "ready",
        structuralMutations: false,
        warnings: report.warnings,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown bootstrap error.");
  process.exitCode = 1;
});
