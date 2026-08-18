import type { CityId, OfferingId } from "@/domain/catalog";

export type RegistrationId = string & { readonly __brand: "RegistrationId" };
export type RequestId = string & { readonly __brand: "RequestId" };

export const REGISTRATION_SCHEMA_VERSION = 1 as const;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REGISTRATION_ID_PATTERN =
  /^reg_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REGISTRATION_SOURCE = {
  web: "WEB",
} as const;

export type RegistrationSource = (typeof REGISTRATION_SOURCE)[keyof typeof REGISTRATION_SOURCE];

export const REGISTRATION_STATUS = {
  new: "NEW",
  inProgress: "IN_PROGRESS",
  accepted: "ACCEPTED",
  cancelled: "CANCELLED",
} as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS];

export type Registration = Readonly<{
  id: RegistrationId;
  requestId: RequestId;
  submittedAt: string;
  offeringId: OfferingId;
  cityIdSnapshot: CityId;
  cityNameSnapshot: string;
  offeringNameSnapshot: string;
  participantFirstName: string;
  participantLastName: string;
  age: number;
  guardianFirstName: string | null;
  guardianLastName: string | null;
  phone: string;
  email: string;
  status: RegistrationStatus;
  notes: string;
  privacyNoticeVersion: string;
  source: RegistrationSource;
  createdAt: string;
  updatedAt: string;
  schemaVersion: typeof REGISTRATION_SCHEMA_VERSION;
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
