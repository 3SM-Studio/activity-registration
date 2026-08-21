import { addMonths, addYears, endOfYear, format, parseISO } from "date-fns";

import type { Season } from "../src/domain/catalog";
import { REGISTRATION_STATUS, type Registration } from "../src/domain/registration";
import { createHeaderMap } from "../src/infrastructure/google/header-map";
import { parseRegistrationRow, parseSeasonRow } from "../src/infrastructure/google/parsers";
import {
  REGISTRATION_HEADERS,
  SEASON_HEADERS,
  SHEET,
} from "../src/infrastructure/google/sheets-contracts";
import { dateOnlyInPoland } from "../src/lib/birth-date";
import { createAdminSheetsClient } from "./_google-admin";

function isoDate(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function retentionDeadline(registration: Registration, season: Season | undefined): string | null {
  if (
    registration.status === REGISTRATION_STATUS.rejected ||
    registration.status === REGISTRATION_STATUS.cancelled
  ) {
    return registration.closedAt ? isoDate(addYears(parseISO(registration.closedAt), 1)) : null;
  }

  if (registration.status === REGISTRATION_STATUS.waitlisted) {
    return season ? isoDate(addMonths(parseISO(season.endDate), 3)) : null;
  }

  if (registration.status === REGISTRATION_STATUS.confirmed) {
    return season ? isoDate(endOfYear(addYears(parseISO(season.endDate), 3))) : null;
  }

  return null;
}

async function main() {
  const client = createAdminSheetsClient();
  const [registrationRows, seasonRows] = await Promise.all([
    client.getValues(`${SHEET.registrations}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
    client.getValues(`${SHEET.seasons}!A:ZZ`, { valueRenderOption: "UNFORMATTED_VALUE" }),
  ]);

  const registrationHeaders = createHeaderMap(registrationRows[0] ?? [], REGISTRATION_HEADERS);
  const seasonHeaders = createHeaderMap(seasonRows[0] ?? [], SEASON_HEADERS);
  const registrations = registrationRows
    .slice(1)
    .map((row, offset) => ({
      rowNumber: offset + 2,
      registration: parseRegistrationRow(row, registrationHeaders),
    }))
    .filter(
      (item): item is { rowNumber: number; registration: Registration } =>
        item.registration !== null,
    );
  const seasons = seasonRows
    .slice(1)
    .map((row) => parseSeasonRow(row, seasonHeaders))
    .filter((season): season is Season => season !== null);
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const today = dateOnlyInPoland(new Date());

  const missingRetentionAnchor: Array<
    Readonly<{ rowNumber: number; registrationId: string; status: string }>
  > = [];
  const due: Array<
    Readonly<{
      rowNumber: number;
      registrationId: string;
      status: string;
      deadline: string;
    }>
  > = [];

  for (const { rowNumber, registration } of registrations) {
    const season = registration.seasonId ? seasonById.get(registration.seasonId) : undefined;
    const deadline = retentionDeadline(registration, season);
    const retentionStatus = [
      REGISTRATION_STATUS.rejected,
      REGISTRATION_STATUS.cancelled,
      REGISTRATION_STATUS.waitlisted,
      REGISTRATION_STATUS.confirmed,
    ].includes(registration.status);

    if (retentionStatus && !deadline) {
      missingRetentionAnchor.push({
        rowNumber,
        registrationId: registration.id,
        status: registration.status,
      });
      continue;
    }

    if (deadline && deadline <= today) {
      due.push({
        rowNumber,
        registrationId: registration.id,
        status: registration.status,
        deadline,
      });
    }
  }

  console.info(
    JSON.stringify(
      {
        mode: "dry-run",
        today,
        due,
        missingRetentionAnchor,
        note: "Raport celowo nie zawiera imion, e-maili, telefonów ani innych PII. Usunięcie wymaga osobnej kontrolowanej decyzji operatora i sprawdzenia legal hold.",
      },
      null,
      2,
    ),
  );

  if (missingRetentionAnchor.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown retention report error.");
  process.exitCode = 1;
});
