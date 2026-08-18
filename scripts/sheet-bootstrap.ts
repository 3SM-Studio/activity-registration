import {
  bootstrapSheetStructure,
  validateSheetStructure,
} from "../src/infrastructure/google/sheet-admin";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();

  console.info("Bootstrapping Google Sheet structure...");
  await bootstrapSheetStructure(client);

  const report = await validateSheetStructure(client);
  console.info(
    JSON.stringify(
      {
        ok: true,
        sheets: report.sheets,
        cityCount: report.cityCount,
        offeringCount: report.offeringCount,
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
