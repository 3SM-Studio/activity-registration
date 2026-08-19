import { classifyRegistrationDuplicates } from "../src/domain/registration-duplicates";
import type { Registration } from "../src/domain/registration";
import { createHeaderMap } from "../src/infrastructure/google/header-map";
import { parseRegistrationRow } from "../src/infrastructure/google/parsers";
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

function businessDuplicatePairs(registrations: readonly Registration[]) {
  const exact = new Set<string>();
  const probable = new Set<string>();

  registrations.forEach((registration, index) => {
    if (!registration.seasonId || !registration.birthDate) {
      return;
    }

    const criteria = {
      seasonId: registration.seasonId,
      offeringId: registration.offeringId,
      cityId: registration.cityIdSnapshot,
      participantFirstName: registration.participantFirstName,
      participantLastName: registration.participantLastName,
      birthDate: registration.birthDate,
      phone: registration.phone,
      email: registration.email,
    } as const;

    for (const candidate of registrations.slice(index + 1)) {
      const match = classifyRegistrationDuplicates([candidate], criteria);
      if (match.kind === "none") {
        continue;
      }

      const pair = [registration.id, match.registration.id].sort().join(":");
      if (match.kind === "exact") {
        exact.add(pair);
      } else {
        probable.add(pair);
      }
    }
  });

  return {
    exactActiveBusinessDuplicatePairs: [...exact],
    probableBusinessDuplicatePairs: [...probable],
  };
}

async function main() {
  const client = createAdminSheetsClient();
  const rows = await client.getValues(`${SHEET.registrations}!A:ZZ`, {
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const headers = createHeaderMap(rows[0] ?? [], REGISTRATION_HEADERS);

  const registrations = rows
    .slice(1)
    .map((row) => parseRegistrationRow(row, headers))
    .filter((registration): registration is Registration => registration !== null);
  const requestIds = registrations.map((registration) => registration.requestId);
  const registrationIds = registrations.map((registration) => registration.id);
  const incompleteTechnicalIds = Math.max(0, rows.length - 1 - registrations.length);
  const businessDuplicates = businessDuplicatePairs(registrations);

  const report = {
    mode: "dry-run",
    rowCount: rows.length > 0 ? rows.length - 1 : 0,
    duplicateRequestIds: duplicates(requestIds),
    duplicateRegistrationIds: duplicates(registrationIds),
    incompleteTechnicalIds,
    ...businessDuplicates,
  };

  console.info(JSON.stringify(report, null, 2));

  if (
    report.duplicateRequestIds.length > 0 ||
    report.duplicateRegistrationIds.length > 0 ||
    report.exactActiveBusinessDuplicatePairs.length > 0 ||
    report.probableBusinessDuplicatePairs.length > 0 ||
    incompleteTechnicalIds > 0
  ) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown reconciliation error.");
  process.exitCode = 1;
});
