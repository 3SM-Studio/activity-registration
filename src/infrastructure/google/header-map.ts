export class SheetSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetSchemaError";
  }
}

export type HeaderMap = ReadonlyMap<string, number>;

type HeaderMapOptions = Readonly<{
  allowUnexpected?: boolean;
}>;

export function createHeaderMap(
  rawHeaderRow: readonly unknown[],
  requiredHeaders: readonly string[],
  options: HeaderMapOptions = {},
): HeaderMap {
  const headers = rawHeaderRow.map((value) => String(value ?? "").trim());
  const map = new Map<string, number>();

  for (const [index, header] of headers.entries()) {
    if (!header) {
      continue;
    }

    if (map.has(header)) {
      throw new SheetSchemaError(`Duplicate spreadsheet header: ${header}`);
    }

    map.set(header, index);
  }

  const missing = requiredHeaders.filter((header) => !map.has(header));
  if (missing.length > 0) {
    throw new SheetSchemaError(`Missing required spreadsheet headers: ${missing.join(", ")}`);
  }

  if (!options.allowUnexpected) {
    const expected = new Set(requiredHeaders);
    const unexpected = [...map.keys()].filter((header) => !expected.has(header));

    if (unexpected.length > 0) {
      throw new SheetSchemaError(
        `Unexpected spreadsheet headers: ${unexpected.join(", ")}. Add schema changes through an explicit migration.`,
      );
    }
  }

  return map;
}

export function cell(row: readonly unknown[], headers: HeaderMap, name: string): string {
  const index = headers.get(name);
  if (index === undefined) {
    throw new SheetSchemaError(`Header is not available: ${name}`);
  }

  return String(row[index] ?? "").trim();
}

export function buildRowByHeaders(
  headerRow: readonly unknown[],
  valuesByHeader: Readonly<Record<string, string | number>>,
): readonly (string | number)[] {
  const normalizedHeaders = headerRow.map((header) => String(header ?? "").trim());

  return normalizedHeaders.map((header) => {
    if (!header) {
      return "";
    }
    return valuesByHeader[header] ?? "";
  });
}
