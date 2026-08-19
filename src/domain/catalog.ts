export const TECHNICAL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,99}$/;

export function isTechnicalId(value: string): boolean {
  return TECHNICAL_ID_PATTERN.test(value);
}

export type CityId = string & { readonly __brand: "CityId" };
export type OfferingId = string & { readonly __brand: "OfferingId" };
export type SeasonId = string & { readonly __brand: "SeasonId" };
export type GroupId = string & { readonly __brand: "GroupId" };

export const REGISTRATION_MODE = {
  rolling: "ROLLING",
  windowed: "WINDOWED",
} as const;

export type RegistrationMode = (typeof REGISTRATION_MODE)[keyof typeof REGISTRATION_MODE];

export const INTAKE_STATE = {
  open: "OPEN",
  waitlistOnly: "WAITLIST_ONLY",
  closed: "CLOSED",
} as const;

export type IntakeState = (typeof INTAKE_STATE)[keyof typeof INTAKE_STATE];

export type City = Readonly<{
  id: CityId;
  name: string;
  active: boolean;
  sortOrder: number;
}>;

export type Season = Readonly<{
  id: SeasonId;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  sortOrder: number;
}>;

export type ClassOffering = Readonly<{
  id: OfferingId;
  cityId: CityId;
  name: string;
  publicDescription: string | null;
  active: boolean;
  sortOrder: number;
  registrationMode: RegistrationMode;
  intakeState: IntakeState;
  registrationOpenFrom: string | null;
  registrationOpenTo: string | null;
  waitlistEnabled: boolean;
}>;

export type InternalGroup = Readonly<{
  id: GroupId;
  seasonId: SeasonId;
  offeringId: OfferingId;
  name: string;
  ageMin: number | null;
  ageMax: number | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  instructor: string | null;
  capacity: number | null;
  active: boolean;
  sortOrder: number;
}>;

export type PublicCity = Pick<City, "id" | "name" | "sortOrder">;
export type PublicOffering = Pick<ClassOffering, "id" | "cityId" | "name" | "sortOrder">;

export type PublicCatalog = Readonly<{
  cities: readonly PublicCity[];
  offerings: readonly PublicOffering[];
}>;

export function asCityId(value: string): CityId {
  return value as CityId;
}

export function asOfferingId(value: string): OfferingId {
  return value as OfferingId;
}

export function asSeasonId(value: string): SeasonId {
  return value as SeasonId;
}

export function asGroupId(value: string): GroupId {
  return value as GroupId;
}
