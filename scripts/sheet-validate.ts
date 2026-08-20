import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { validateSupportingSheetTables } from "../src/infrastructure/google/supporting-sheet-tables";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();
  const report = await validateSheetStructure(client);
  await validateSupportingSheetTables(client);

  console.info(
    JSON.stringify(
      {
        ok: true,
        sheets: report.sheets,
        cityCount: report.cityCount,
        offeringCount: report.offeringCount,
        nativeTables: "ready",
        warnings: report.warnings,
      },
      null,
      2,
    ),
  );

  if (report.warnings.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown validation error.");
  process.exitCode = 1;
});
