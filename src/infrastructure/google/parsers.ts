import {
  INTAKE_STATE,
  REGISTRATION_MODE,
  asCityId,
  asGroupId,
  asOfferingId,
  asSeasonId,
  isTechnicalId,
  type City,
  type ClassOffering,
  type InternalGroup,
  type Season,
} from "@/domain/catalog";
import type { Registration } from "@/domain/registration";
import {
  asRegistrationId,
  asRequestId,
  BIRTH_DATE_REGISTRATION_SCHEMA_VERSION,
  isRegistrationId,
  isRequestId,
  LEGACY_REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  type RegistrationSchemaVersion,
} from "@/domain/registration";
import { googleSerialToIsoDate } from "@/infrastructure/google/google-date";
import {
  cell,
  rawCell,
  type HeaderMap,
  SheetSchemaError,
} from "@/infrastructure/google/header-map";
import { calculateAgeAtDate, dateOnlyInPoland, isValidIsoDateOnly } from "@/lib/birth-date";

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

function parseOptionalInteger(value: string, label: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new SheetSchemaError(`Invalid ${label}: ${value}`);
  }

  return parsed;
}

function parseDateOnlyValue(raw: unknown, label: string): string {
  const value = typeof raw === "number" ? googleSerialToIsoDate(raw) : String(raw ?? "").trim();
  if (!value || !isValidIsoDateOnly(value)) {
    throw new SheetSchemaError(`Invalid ${label}: ${String(raw ?? "<empty>")}`);
  }
  return value;
}

function parseOptionalDateOnlyValue(raw: unknown, label: string): string | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return null;
  }
  return parseDateOnlyValue(raw, label);
}

function parseOptionalTimestamp(
  value: string,
  label: string,
  registrationId: string,
): string | null {
  if (!value) {
    return null;
  }
  if (Number.isNaN(Date.parse(value))) {
    throw new SheetSchemaError(`Invalid ${label} for registration ${registrationId}`);
  }
  return value;
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

export function parseSeasonRow(row: readonly unknown[], headers: HeaderMap): Season | null {
  const id = cell(row, headers, "SEASON_ID");
  const name = cell(row, headers, "NAME");

  if (!id && !name) {
    return null;
  }

  if (!id || !name || !isTechnicalId(id)) {
    return null;
  }

  const startDate = parseDateOnlyValue(
    rawCell(row, headers, "START_DATE"),
    `season ${id} START_DATE`,
  );
  const endDate = parseDateOnlyValue(rawCell(row, headers, "END_DATE"), `season ${id} END_DATE`);

  if (startDate > endDate) {
    throw new SheetSchemaError(`Season ${id} START_DATE is after END_DATE.`);
  }

  return {
    id: asSeasonId(id),
    name,
    startDate,
    endDate,
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

  const registrationMode = cell(row, headers, "REGISTRATION_MODE");
  if (!Object.values(REGISTRATION_MODE).includes(registrationMode as never)) {
    throw new SheetSchemaError(`Offering ${id} has invalid REGISTRATION_MODE: ${registrationMode}`);
  }

  const intakeState = cell(row, headers, "INTAKE_STATE");
  if (!Object.values(INTAKE_STATE).includes(intakeState as never)) {
    throw new SheetSchemaError(`Offering ${id} has invalid INTAKE_STATE: ${intakeState}`);
  }

  return {
    id: asOfferingId(id),
    cityId: asCityId(cityId),
    name,
    publicDescription: cell(row, headers, "PUBLIC_DESCRIPTION") || null,
    active: parseBooleanCell(cell(row, headers, "ACTIVE")),
    sortOrder: parseSortOrder(cell(row, headers, "SORT_ORDER")),
    registrationMode: registrationMode as ClassOffering["registrationMode"],
    intakeState: intakeState as ClassOffering["intakeState"],
    registrationOpenFrom: parseOptionalDateOnlyValue(
      rawCell(row, headers, "REGISTRATION_OPEN_FROM"),
      `offering ${id} REGISTRATION_OPEN_FROM`,
    ),
    registrationOpenTo: parseOptionalDateOnlyValue(
      rawCell(row, headers, "REGISTRATION_OPEN_TO"),
      `offering ${id} REGISTRATION_OPEN_TO`,
    ),
    waitlistEnabled: parseBooleanCell(cell(row, headers, "WAITLIST_ENABLED")),
  };
}

export function parseGroupRow(row: readonly unknown[], headers: HeaderMap): InternalGroup | null {
  const id = cell(row, headers, "GROUP_ID");
  const seasonId = cell(row, headers, "SEASON_ID");
  const offeringId = cell(row, headers, "OFFERING_ID");
  const name = cell(row, headers, "NAME");

  if (!id && !seasonId && !offeringId && !name) {
    return null;
  }

  if (
    !id ||
    !seasonId ||
    !offeringId ||
    !name ||
    !isTechnicalId(id) ||
    !isTechnicalId(seasonId) ||
    !isTechnicalId(offeringId)
  ) {
    return null;
  }

  const ageMin = parseOptionalInteger(cell(row, headers, "AGE_MIN"), `group ${id} AGE_MIN`);
  const ageMax = parseOptionalInteger(cell(row, headers, "AGE_MAX"), `group ${id} AGE_MAX`);
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    throw new SheetSchemaError(`Group ${id} AGE_MIN is greater than AGE_MAX.`);
  }

  return {
    id: asGroupId(id),
    seasonId: asSeasonId(seasonId),
    offeringId: asOfferingId(offeringId),
    name,
    ageMin,
    ageMax,
    dayOfWeek: cell(row, headers, "DAY_OF_WEEK") || null,
    startTime: cell(row, headers, "START_TIME") || null,
    endTime: cell(row, headers, "END_TIME") || null,
    location: cell(row, headers, "LOCATION") || null,
    instructor: cell(row, headers, "INSTRUCTOR") || null,
    capacity: parseOptionalInteger(cell(row, headers, "CAPACITY"), `group ${id} CAPACITY`),
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

function parseRegistrationSchemaVersion(raw: string): RegistrationSchemaVersion {
  const version = Number(raw);
  if (
    version === LEGACY_REGISTRATION_SCHEMA_VERSION ||
    version === BIRTH_DATE_REGISTRATION_SCHEMA_VERSION ||
    version === REGISTRATION_SCHEMA_VERSION
  ) {
    return version;
  }

  throw new SheetSchemaError(`Unsupported registration schema version: ${raw}`);
}

function parseBirthDate(
  row: readonly unknown[],
  headers: HeaderMap,
  schemaVersion: RegistrationSchemaVersion,
  registrationId: string,
): string | null {
  if (schemaVersion === LEGACY_REGISTRATION_SCHEMA_VERSION) {
    return null;
  }

  const raw = rawCell(row, headers, "BIRTH_DATE");
  const birthDate = typeof raw === "number" ? googleSerialToIsoDate(raw) : String(raw ?? "").trim();

  if (!birthDate || !isValidIsoDateOnly(birthDate)) {
    throw new SheetSchemaError(`Invalid birth date for registration ${registrationId}`);
  }

  return birthDate;
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

  const ageAtSubmission = Number(cell(row, headers, "AGE_AT_SUBMISSION"));
  if (!Number.isInteger(ageAtSubmission) || ageAtSubmission < 0 || ageAtSubmission > 120) {
    throw new SheetSchemaError(`Invalid age snapshot for registration ${id}`);
  }

  const schemaVersion = parseRegistrationSchemaVersion(cell(row, headers, "SCHEMA_VERSION"));
  const birthDate = parseBirthDate(row, headers, schemaVersion, id);

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

  if (birthDate) {
    const expectedAge = calculateAgeAtDate(birthDate, dateOnlyInPoland(new Date(submittedAt)));
    if (expectedAge !== ageAtSubmission) {
      throw new SheetSchemaError(`Birth date and age snapshot disagree for registration ${id}`);
    }
  }

  let seasonId = null;
  let seasonNameSnapshot = null;
  let assignedGroupId = null;
  let contactedAt = null;
  let confirmedAt = null;
  let possibleDuplicateOf = null;

  if (schemaVersion === REGISTRATION_SCHEMA_VERSION) {
    const rawSeasonId = cell(row, headers, "SEASON_ID");
    const rawSeasonName = cell(row, headers, "SEASON_NAME_SNAPSHOT");
    if (!isTechnicalId(rawSeasonId) || !rawSeasonName) {
      throw new SheetSchemaError(`Invalid season snapshot for registration ${id}`);
    }
    seasonId = asSeasonId(rawSeasonId);
    seasonNameSnapshot = rawSeasonName;

    const rawGroupId = cell(row, headers, "ASSIGNED_GROUP_ID");
    if (rawGroupId) {
      if (!isTechnicalId(rawGroupId)) {
        throw new SheetSchemaError(`Invalid assigned group ID for registration ${id}`);
      }
      assignedGroupId = asGroupId(rawGroupId);
    }

    contactedAt = parseOptionalTimestamp(cell(row, headers, "CONTACTED_AT"), "CONTACTED_AT", id);
    confirmedAt = parseOptionalTimestamp(cell(row, headers, "CONFIRMED_AT"), "CONFIRMED_AT", id);

    const rawPossibleDuplicateOf = cell(row, headers, "POSSIBLE_DUPLICATE_OF");
    if (rawPossibleDuplicateOf) {
      if (!isRegistrationId(rawPossibleDuplicateOf)) {
        throw new SheetSchemaError(`Invalid POSSIBLE_DUPLICATE_OF for registration ${id}`);
      }
      possibleDuplicateOf = asRegistrationId(rawPossibleDuplicateOf);
    }
  }

  return {
    id: asRegistrationId(id),
    requestId: asRequestId(requestId),
    submittedAt,
    seasonId,
    seasonNameSnapshot,
    offeringId: asOfferingId(offeringId),
    cityIdSnapshot: asCityId(cityId),
    cityNameSnapshot: cell(row, headers, "CITY_NAME_SNAPSHOT"),
    offeringNameSnapshot: cell(row, headers, "OFFERING_NAME_SNAPSHOT"),
    participantFirstName: cell(row, headers, "PARTICIPANT_FIRST_NAME"),
    participantLastName: cell(row, headers, "PARTICIPANT_LAST_NAME"),
    birthDate,
    ageAtSubmission,
    guardianFirstName: cell(row, headers, "GUARDIAN_FIRST_NAME") || null,
    guardianLastName: cell(row, headers, "GUARDIAN_LAST_NAME") || null,
    phone: cell(row, headers, "PHONE"),
    email: cell(row, headers, "EMAIL"),
    status: rawStatus as Registration["status"],
    assignedGroupId,
    contactedAt,
    confirmedAt,
    possibleDuplicateOf,
    notes: cell(row, headers, "NOTES"),
    privacyNoticeVersion: cell(row, headers, "PRIVACY_NOTICE_VERSION"),
    source,
    createdAt,
    updatedAt,
    schemaVersion,
  };
}
