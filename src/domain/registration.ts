import type { CityId, GroupId, OfferingId, SeasonId } from "@/domain/catalog";

export type RegistrationId = string & { readonly __brand: "RegistrationId" };
export type RequestId = string & { readonly __brand: "RequestId" };

export const LEGACY_REGISTRATION_SCHEMA_VERSION = 1 as const;
export const BIRTH_DATE_REGISTRATION_SCHEMA_VERSION = 2 as const;
export const WORKFLOW_REGISTRATION_SCHEMA_VERSION = 3 as const;
export const REGISTRATION_SCHEMA_VERSION = 4 as const;
export type RegistrationSchemaVersion =
  | typeof LEGACY_REGISTRATION_SCHEMA_VERSION
  | typeof BIRTH_DATE_REGISTRATION_SCHEMA_VERSION
  | typeof WORKFLOW_REGISTRATION_SCHEMA_VERSION
  | typeof REGISTRATION_SCHEMA_VERSION;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REGISTRATION_ID_PATTERN =
  /^reg_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REGISTRATION_SOURCE = {
  web: "WEB",
} as const;

export type RegistrationSource = (typeof REGISTRATION_SOURCE)[keyof typeof REGISTRATION_SOURCE];

// Age ranges guide operator review only. They must never block creating a registration.
export const AGE_REVIEW_NOTE_MARKER = "Wiek poza standardowym zakresem grupy" as const;
export const AGE_REVIEW_NOTE =
  `⚠ ${AGE_REVIEW_NOTE_MARKER}. Zweryfikuj ręcznie przed potwierdzeniem.` as const;

export const REGISTRATION_STATUS = {
  new: "NEW",
  inReview: "IN_REVIEW",
  contacted: "CONTACTED",
  waitlisted: "WAITLISTED",
  confirmed: "CONFIRMED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
} as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS];

export const LEGACY_REGISTRATION_STATUS = {
  inProgress: "IN_PROGRESS",
  accepted: "ACCEPTED",
} as const;

export function normalizeStoredRegistrationStatus(value: string): RegistrationStatus | null {
  const current = Object.values(REGISTRATION_STATUS).find((status) => status === value);
  if (current) {
    return current;
  }

  if (value === LEGACY_REGISTRATION_STATUS.inProgress) {
    return REGISTRATION_STATUS.inReview;
  }

  if (value === LEGACY_REGISTRATION_STATUS.accepted) {
    return REGISTRATION_STATUS.confirmed;
  }

  return null;
}

export type Registration = Readonly<{
  id: RegistrationId;
  requestId: RequestId;
  submittedAt: string;
  seasonId: SeasonId | null;
  seasonNameSnapshot: string | null;
  offeringId: OfferingId;
  cityIdSnapshot: CityId;
  cityNameSnapshot: string;
  offeringNameSnapshot: string;
  participantFirstName: string;
  participantLastName: string;
  birthDate: string | null;
  ageAtSubmission: number;
  guardianFirstName: string | null;
  guardianLastName: string | null;
  phone: string;
  email: string;
  status: RegistrationStatus;
  assignedGroupId: GroupId | null;
  contactedAt: string | null;
  confirmedAt: string | null;
  closedAt: string | null;
  possibleDuplicateOf: RegistrationId | null;
  notes: string;
  privacyNoticeVersion: string;
  source: RegistrationSource;
  createdAt: string;
  updatedAt: string;
  schemaVersion: RegistrationSchemaVersion;
}>;

export function isRegistrationId(value: string): boolean {
  return REGISTRATION_ID_PATTERN.test(value);
}

export function isRequestId(value: string): boolean {
  return UUID_V4_PATTERN.test(value);
}

export function asRegistrationId(value: string): RegistrationId {
  return value as RegistrationId;
}

export function asRequestId(value: string): RequestId {
  return value as RequestId;
}
