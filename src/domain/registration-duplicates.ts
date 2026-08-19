import type { CityId, OfferingId, SeasonId } from "@/domain/catalog";
import type { Registration, RegistrationId } from "@/domain/registration";

export type RegistrationDuplicateCriteria = Readonly<{
  seasonId: SeasonId;
  offeringId: OfferingId;
  cityId: CityId;
  participantFirstName: string;
  participantLastName: string;
  birthDate: string;
  phone: string;
  email: string;
}>;

export type RegistrationDuplicateMatch =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "exact"; registration: Registration }>
  | Readonly<{ kind: "probable"; registration: Registration }>;

const FRESH_REQUEST_STATUSES = new Set(["REJECTED", "CANCELLED"]);

export function normalizeNameForDuplicateComparison(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("pl-PL");
}

export function registrationStatusAllowsFreshRequest(status: string): boolean {
  return FRESH_REQUEST_STATUSES.has(status);
}

function namesMatch(registration: Registration, criteria: RegistrationDuplicateCriteria): boolean {
  return (
    normalizeNameForDuplicateComparison(registration.participantFirstName) ===
      normalizeNameForDuplicateComparison(criteria.participantFirstName) &&
    normalizeNameForDuplicateComparison(registration.participantLastName) ===
      normalizeNameForDuplicateComparison(criteria.participantLastName)
  );
}

function fullIdentityMatches(
  registration: Registration,
  criteria: RegistrationDuplicateCriteria,
): boolean {
  return (
    registration.birthDate !== null &&
    registration.birthDate === criteria.birthDate &&
    registration.seasonId === criteria.seasonId &&
    registration.offeringId === criteria.offeringId &&
    registration.cityIdSnapshot === criteria.cityId &&
    namesMatch(registration, criteria)
  );
}

function legacyCandidateMatches(
  registration: Registration,
  criteria: RegistrationDuplicateCriteria,
): boolean {
  if (registration.birthDate !== null) {
    return false;
  }

  return (
    registration.offeringId === criteria.offeringId &&
    registration.cityIdSnapshot === criteria.cityId &&
    namesMatch(registration, criteria) &&
    (registration.phone === criteria.phone || registration.email === criteria.email)
  );
}

export function isPotentialDuplicateCandidate(
  registration: Registration,
  criteria: RegistrationDuplicateCriteria,
): boolean {
  return fullIdentityMatches(registration, criteria) || legacyCandidateMatches(registration, criteria);
}

function newestFirst(left: Registration, right: Registration): number {
  return right.submittedAt.localeCompare(left.submittedAt);
}

export function classifyRegistrationDuplicates(
  candidates: readonly Registration[],
  criteria: RegistrationDuplicateCriteria,
): RegistrationDuplicateMatch {
  const activeCandidates = candidates
    .filter((registration) => !registrationStatusAllowsFreshRequest(registration.status))
    .filter((registration) => isPotentialDuplicateCandidate(registration, criteria))
    .sort(newestFirst);

  const exact = activeCandidates.find(
    (registration) =>
      fullIdentityMatches(registration, criteria) &&
      registration.phone === criteria.phone &&
      registration.email === criteria.email,
  );

  if (exact) {
    return { kind: "exact", registration: exact };
  }

  const probable = activeCandidates.find(
    (registration) =>
      fullIdentityMatches(registration, criteria) || legacyCandidateMatches(registration, criteria),
  );

  return probable ? { kind: "probable", registration: probable } : { kind: "none" };
}

export function possibleDuplicateRegistrationId(
  match: RegistrationDuplicateMatch,
): RegistrationId | null {
  return match.kind === "probable" ? match.registration.id : null;
}
