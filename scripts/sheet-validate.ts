import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { SHEET } from "../src/infrastructure/google/sheets-contracts";
import { validateSupportingSheetTables } from "../src/infrastructure/google/supporting-sheet-tables";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();

  try {
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
  } catch (error: unknown) {
    try {
      const metadata = await client.getSheetMetadata();
      const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);

      console.error("ZAPISY native table metadata snapshot:");
      console.error(
        JSON.stringify(
          {
            sheetId: registrationSheet?.sheetId ?? null,
            tables: registrationSheet?.tables ?? [],
          },
          null,
          2,
        ),
      );
    } catch (metadataError: unknown) {
      console.error(
        `Failed to read ZAPISY native table metadata: ${
          metadataError instanceof Error ? metadataError.message : "unknown metadata error"
        }`,
      );
    }

    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown validation error.");
  process.exitCode = 1;
});
