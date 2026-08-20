import {
  bootstrapOperatorSheetExperience,
  validateOperatorSheetExperience,
} from "../src/infrastructure/google/operator-sheet";
import {
  bootstrapSheetStructure,
  validateSheetStructure,
} from "../src/infrastructure/google/sheet-admin";
import {
  bootstrapSupportingSheetTables,
  validateSupportingSheetTables,
} from "../src/infrastructure/google/supporting-sheet-tables";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();

  console.info("Bootstrapping Google Sheet structure...");
  await bootstrapSheetStructure(client);
  await bootstrapSupportingSheetTables(client);
  await bootstrapOperatorSheetExperience(client);

  const report = await validateSheetStructure(client);
  await validateSupportingSheetTables(client);
  await validateOperatorSheetExperience(client);
  console.info(
    JSON.stringify(
      {
        ok: true,
        sheets: report.sheets,
        cityCount: report.cityCount,
        offeringCount: report.offeringCount,
        nativeTables: "ready",
        operatorExperience: "ready",
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
