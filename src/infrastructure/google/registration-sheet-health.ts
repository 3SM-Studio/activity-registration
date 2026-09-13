import { createHeaderMap } from "@/infrastructure/google/header-map";
import { REGISTRATION_HEADERS, SHEET } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

const REGISTRATION_DATE_HEADERS = [
  "BIRTH_DATE",
  "CONTACTED_AT",
  "CONFIRMED_AT",
  "CLOSED_AT",
] as const;

function columnLabel(columnIndex: number): string {
  let value = columnIndex + 1;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function looksLikeUnformattedDateSerial(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+(?:[.,]\d+)?$/.test(trimmed);
}

export async function validateRegistrationDatePresentation(client: SheetsClient): Promise<void> {
  const headerRows = await client.getValues(`${SHEET.registrations}!A1:AC1`);
  const headers = createHeaderMap(headerRows[0] ?? [], REGISTRATION_HEADERS);

  for (const header of REGISTRATION_DATE_HEADERS) {
    const columnIndex = headers.get(header);
    if (columnIndex === undefined) {
      throw new Error(`ZAPISY is missing ${header}.`);
    }

    const column = columnLabel(columnIndex);
    const values = await client.getValues(`${SHEET.registrations}!${column}2:${column}`);
    const badRowOffset = values.findIndex((row) => looksLikeUnformattedDateSerial(row[0]));

    if (badRowOffset >= 0) {
      throw new Error(
        `ZAPISY ${header} has an unformatted date serial at row ${badRowOffset + 2}. ` +
          "Repair date presentation before treating production diagnostics as green.",
      );
    }
  }
}
