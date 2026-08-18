import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import { REGISTRATION_HEADERS, SHEET } from "../src/infrastructure/google/sheets-contracts";
import { createAdminSheetsClient } from "./_google-admin";

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicatesSet = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }
    if (seen.has(value)) {
      duplicatesSet.add(value);
    }
    seen.add(value);
  }

  return [...duplicatesSet];
}

async function main() {
  const client = createAdminSheetsClient();
  const rows = await client.getValues(`${SHEET.registrations}!A:ZZ`);
  const headers = createHeaderMap(rows[0] ?? [], REGISTRATION_HEADERS);

  const requestIds: string[] = [];
  const registrationIds: string[] = [];
  let incompleteTechnicalIds = 0;

  for (const row of rows.slice(1)) {
    const requestId = cell(row, headers, "REQUEST_ID");
    const registrationId = cell(row, headers, "REGISTRATION_ID");

    if (!requestId || !registrationId) {
      incompleteTechnicalIds += 1;
      continue;
    }

    requestIds.push(requestId);
    registrationIds.push(registrationId);
  }

  const report = {
    mode: "dry-run",
    rowCount: rows.length > 0 ? rows.length - 1 : 0,
    duplicateRequestIds: duplicates(requestIds),
    duplicateRegistrationIds: duplicates(registrationIds),
    incompleteTechnicalIds,
  };

  console.info(JSON.stringify(report, null, 2));

  if (
    report.duplicateRequestIds.length > 0 ||
    report.duplicateRegistrationIds.length > 0 ||
    incompleteTechnicalIds > 0
  ) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown reconciliation error.");
  process.exitCode = 1;
});
