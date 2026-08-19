const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const POLAND_TIME_ZONE = "Europe/Warsaw";

export type DateOnlyParts = Readonly<{
  year: number;
  month: number;
  day: number;
}>;

export function parseIsoDateOnly(value: string): DateOnlyParts | null {
  const match = ISO_DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidIsoDateOnly(value: string): boolean {
  return parseIsoDateOnly(value) !== null;
}

export function formatIsoDateOnly(parts: DateOnlyParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dateOnlyInPoland(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: POLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function calculateAgeAtDate(birthDate: string, referenceDate: string): number {
  const birth = parseIsoDateOnly(birthDate);
  const reference = parseIsoDateOnly(referenceDate);

  if (!birth || !reference) {
    throw new Error("Invalid ISO date-only value.");
  }

  let age = reference.year - birth.year;
  const birthdayHasPassed =
    reference.month > birth.month ||
    (reference.month === birth.month && reference.day >= birth.day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age;
}

export function calculateAgeToday(birthDate: string): number {
  return calculateAgeAtDate(birthDate, dateOnlyInPoland(new Date()));
}
