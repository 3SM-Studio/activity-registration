import { LEGACY_REGISTRATION_STATUS } from "../src/domain/registration";
import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import {
  REGISTRATION_HEADERS,
  SHEET,
} from "../src/infrastructure/google/sheets-contracts";
import { getServerEnv } from "../src/lib/env";
import { createAdminSheetsClient } from "./_google-admin";

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

  const client = createAdminSheetsClient();
  const report = await validateSheetStructure(client);
  const registrationRows = await client.getValues(`${SHEET.registrations}!A:ZZ`);
  const registrationHeaders = createHeaderMap(
    registrationRows[0] ?? [],
    REGISTRATION_HEADERS,
  );
  const legacyWorkflowStatuses = registrationRows
    .slice(1)
    .map((row, offset) => ({
      rowNumber: offset + 2,
      status: cell(row, registrationHeaders, "STATUS"),
    }))
    .filter(
      ({ status }) =>
        status === LEGACY_REGISTRATION_STATUS.inProgress ||
        status === LEGACY_REGISTRATION_STATUS.accepted,
    );

  if (legacyWorkflowStatuses.length > 0) {
    throw new Error(
      `ZAPISY still contains ${legacyWorkflowStatuses.length} legacy workflow status value(s). Run sheet:migrate before treating diagnostics as green.`,
    );
  }

  console.info(
    JSON.stringify(
      {
        ok: true,
        appEnv: env.APP_ENV,
        dataBackend: env.DATA_BACKEND,
        spreadsheetConfigured: Boolean(env.GOOGLE_SPREADSHEET_ID),
        cityCount: report.cityCount,
        seasonCount: report.seasonCount,
        offeringCount: report.offeringCount,
        groupCount: report.groupCount,
        legacyWorkflowStatusCount: 0,
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
