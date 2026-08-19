import { formatIsoDateOnly, parseIsoDateOnly } from "@/lib/birth-date";

const GOOGLE_SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export function isoDateToGoogleSerial(value: string): number {
  const parts = parseIsoDateOnly(value);
  if (!parts) {
    throw new Error(`Invalid ISO date-only value: ${value}`);
  }

  return (Date.UTC(parts.year, parts.month - 1, parts.day) - GOOGLE_SHEETS_EPOCH_MS) / DAY_MS;
}

export function googleSerialToIsoDate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid Google Sheets date serial.");
  }

  const date = new Date(GOOGLE_SHEETS_EPOCH_MS + Math.round(value) * DAY_MS);
  return formatIsoDateOnly({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}
