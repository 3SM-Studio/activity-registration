import {
  asCityId,
  asOfferingId,
  isTechnicalId,
  type City,
  type ClassOffering,
} from "@/domain/catalog";
import type { Registration } from "@/domain/registration";
import {
  asRegistrationId,
  asRequestId,
  isRegistrationId,
  isRequestId,
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
} from "@/domain/registration";
import { cell, type HeaderMap, SheetSchemaError } from "@/infrastructure/google/header-map";

export function parseBooleanCell(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return ["TAK", "TRUE", "1", "YES"].includes(normalized);
}

function parseSortOrder(value: string): number {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseCityRow(row: readonly unknown[], headers: HeaderMap): City | null {
  const id = cell(row, headers, "CITY_ID");
  const name = cell(row, headers, "NAME");

  if (!id && !name) {
    return null;
  }

  if (!id || !name || !isTechnicalId(id)) {
    return null;
  }

  return {
    id: asCityId(id),
    name,
    active: parseBooleanCell(cell(row, headers, "ACTIVE")),
    sortOrder: parseSortOrder(cell(row, headers, "SORT_ORDER")),
  };
}

export function parseOfferingRow(
  row: readonly unknown[],
  headers: HeaderMap,
): ClassOffering | null {
  const id = cell(row, headers, "OFFERING_ID");
  const cityId = cell(row, headers, "CITY_ID");
  const name = cell(row, headers, "NAME");

  if (!id && !cityId && !name) {
    return null;
  }

  if (!id || !cityId || !name || !isTechnicalId(id) || !isTechnicalId(cityId)) {
    return null;
  }

  return {
    id: asOfferingId(id),
    cityId: asCityId(cityId),
    name,
    active: parseBooleanCell(cell(row, headers, "ACTIVE")),
    sortOrder: parseSortOrder(cell(row, headers, "SORT_ORDER")),
  };
}

export function assertUniqueIds<T extends { readonly id: string }>(
  records: readonly T[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) {
      throw new SheetSchemaError(`Duplicate ${label} ID: ${record.id}`);
    }
    seen.add(record.id);
  }
}

export function parseRegistrationRow(
  row: readonly unknown[],
  headers: HeaderMap,
): Registration | null {
  const id = cell(row, headers, "REGISTRATION_ID");
  const requestId = cell(row, headers, "REQUEST_ID");

  if (!id && !requestId) {
    return null;
  }

  if (!id || !requestId) {
    throw new SheetSchemaError("Registration row is missing a technical identifier.");
  }

  if (!isRegistrationId(id)) {
    throw new SheetSchemaError(`Invalid registration ID: ${id}`);
  }

  if (!isRequestId(requestId)) {
    throw new SheetSchemaError(`Invalid request ID for ${id}: ${requestId}`);
  }

  const offeringId = cell(row, headers, "OFFERING_ID");
  const cityId = cell(row, headers, "CITY_ID_SNAPSHOT");
  if (!isTechnicalId(offeringId) || !isTechnicalId(cityId)) {
    throw new SheetSchemaError(`Invalid catalog identifier for registration ${id}`);
  }

  const rawStatus = cell(row, headers, "STATUS");
  const allowedStatuses = new Set<string>(Object.values(REGISTRATION_STATUS));
  if (!allowedStatuses.has(rawStatus)) {
    throw new SheetSchemaError(`Unknown registration status for ${id}: ${rawStatus}`);
  }

  const source = cell(row, headers, "SOURCE");
  if (source !== REGISTRATION_SOURCE.web) {
    throw new SheetSchemaError(`Unsupported registration source for ${id}: ${source}`);
  }

  const age = Number(cell(row, headers, "AGE"));
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    throw new SheetSchemaError(`Invalid age for registration ${id}`);
  }

  const schemaVersion = Number(cell(row, headers, "SCHEMA_VERSION"));
  if (schemaVersion !== REGISTRATION_SCHEMA_VERSION) {
    throw new SheetSchemaError(`Unsupported registration schema version: ${schemaVersion}`);
  }

  const submittedAt = cell(row, headers, "SUBMITTED_AT");
  const createdAt = cell(row, headers, "CREATED_AT");
  const updatedAt = cell(row, headers, "UPDATED_AT");
  for (const [label, timestamp] of [
    ["SUBMITTED_AT", submittedAt],
    ["CREATED_AT", createdAt],
    ["UPDATED_AT", updatedAt],
  ] as const) {
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
      throw new SheetSchemaError(`Invalid ${label} for registration ${id}`);
    }
  }

  return {
    id: asRegistrationId(id),
    requestId: asRequestId(requestId),
    submittedAt,
    offeringId: asOfferingId(offeringId),
    cityIdSnapshot: asCityId(cityId),
    cityNameSnapshot: cell(row, headers, "CITY_NAME_SNAPSHOT"),
    offeringNameSnapshot: cell(row, headers, "OFFERING_NAME_SNAPSHOT"),
    participantFirstName: cell(row, headers, "PARTICIPANT_FIRST_NAME"),
    participantLastName: cell(row, headers, "PARTICIPANT_LAST_NAME"),
    age,
    guardianFirstName: cell(row, headers, "GUARDIAN_FIRST_NAME") || null,
    guardianLastName: cell(row, headers, "GUARDIAN_LAST_NAME") || null,
    phone: cell(row, headers, "PHONE"),
    email: cell(row, headers, "EMAIL"),
    status: rawStatus as Registration["status"],
    notes: cell(row, headers, "NOTES"),
    privacyNoticeVersion: cell(row, headers, "PRIVACY_NOTICE_VERSION"),
    source,
    createdAt,
    updatedAt,
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
  };
}
