import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { createAdminSheetsClient } from "./_google-admin";
import { getServerEnv } from "../src/lib/env";

async function main() {
  const env = getServerEnv();

  if (env.DATA_BACKEND === "memory") {
    console.info(
      JSON.stringify(
        {
          ok: true,
          appEnv: env.APP_ENV,
          dataBackend: env.DATA_BACKEND,
          note: "Memory backend active. Google diagnostics skipped.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const report = await validateSheetStructure(createAdminSheetsClient());

  console.info(
    JSON.stringify(
      {
        ok: true,
        appEnv: env.APP_ENV,
        dataBackend: env.DATA_BACKEND,
        spreadsheetConfigured: Boolean(env.GOOGLE_SPREADSHEET_ID),
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
  console.error(error instanceof Error ? error.message : "Unknown diagnostics error.");
  process.exitCode = 1;
});
