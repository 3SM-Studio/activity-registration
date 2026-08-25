import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { validateSupportingSheetTables } from "../src/infrastructure/google/supporting-sheet-tables";
import { REGISTRATIONS_TABLE_ID, SHEET } from "../src/infrastructure/google/sheets-contracts";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const client = createAdminSheetsClient();
  const metadata = await client.getSheetMetadata();
  const registrationSheet = metadata.find((sheet) => sheet.title === SHEET.registrations);
  const registrationTable = registrationSheet?.tables?.find(
    (table) => table.tableId === REGISTRATIONS_TABLE_ID,
  );

  console.info(
    JSON.stringify(
      {
        sheetContractDiagnostics: {
          registrationTable: registrationTable
            ? {
                tableId: registrationTable.tableId,
                name: registrationTable.name,
                startRowIndex: registrationTable.startRowIndex ?? null,
                endRowIndex: registrationTable.endRowIndex ?? null,
                startColumnIndex: registrationTable.startColumnIndex ?? null,
                endColumnIndex: registrationTable.endColumnIndex ?? null,
                columnProperties: registrationTable.columnProperties.map((column) => ({
                  columnIndex: column.columnIndex,
                  columnName: column.columnName,
                  columnType: column.columnType,
                  dropdownValues: column.dropdownValues ?? [],
                })),
              }
            : null,
        },
      },
      null,
      2,
    ),
  );

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
