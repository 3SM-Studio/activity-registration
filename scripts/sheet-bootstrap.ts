import {
  bootstrapSheetStructure,
  validateSheetStructure,
} from "../src/infrastructure/google/sheet-admin";
import {
  bootstrapOperatorSheetExperience,
  validateOperatorSheetExperience,
} from "../src/infrastructure/google/operator-sheet";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();

  console.info("Bootstrapping Google Sheet structure...");
  await bootstrapSheetStructure(client);
  await bootstrapOperatorSheetExperience(client);

  const report = await validateSheetStructure(client);
  await validateOperatorSheetExperience(client);
  console.info(
    JSON.stringify(
      {
        ok: true,
        sheets: report.sheets,
        cityCount: report.cityCount,
        offeringCount: report.offeringCount,
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
