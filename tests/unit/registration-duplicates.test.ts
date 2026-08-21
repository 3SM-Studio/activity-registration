import { describe, expect, it } from "vitest";

import { asCityId, asOfferingId, asSeasonId } from "@/domain/catalog";
import {
  classifyRegistrationDuplicates,
  normalizeNameForDuplicateComparison,
  type RegistrationDuplicateCriteria,
} from "@/domain/registration-duplicates";
import {
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  asRegistrationId,
  asRequestId,
  type Registration,
} from "@/domain/registration";

const criteria: RegistrationDuplicateCriteria = {
  seasonId: asSeasonId("test-2026-2027"),
  offeringId: asOfferingId("gdynia-hiphop"),
  cityId: asCityId("gdynia"),
  participantFirstName: "Jan",
  participantLastName: "Kowalski",
  birthDate: "2000-01-15",
  phone: "+48500000000",
  email: "jan@example.com",
};

function registration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: asRegistrationId("reg_11111111-1111-4111-8111-111111111111"),
    requestId: asRequestId("11111111-1111-4111-8111-111111111111"),
    submittedAt: "2026-08-19T12:00:00.000Z",
    seasonId: criteria.seasonId,
    seasonNameSnapshot: "2026/2027",
    offeringId: criteria.offeringId,
    cityIdSnapshot: criteria.cityId,
    cityNameSnapshot: "Gdynia",
    offeringNameSnapshot: "Hip-hop",
    participantFirstName: "Jan",
    participantLastName: "Kowalski",
    birthDate: criteria.birthDate,
    ageAtSubmission: 26,
    guardianFirstName: null,
    guardianLastName: null,
    phone: criteria.phone,
    email: criteria.email,
    status: REGISTRATION_STATUS.new,
    assignedGroupId: null,
    contactedAt: null,
    confirmedAt: null,
    closedAt: null,
    possibleDuplicateOf: null,
    notes: "",
    privacyNoticeVersion: "v1",
    source: REGISTRATION_SOURCE.web,
    createdAt: "2026-08-19T12:00:00.000Z",
    updatedAt: "2026-08-19T12:00:00.000Z",
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
    ...overrides,
  };
}

describe("registration business duplicates", () => {
  it("normalizes names using NFC, case-insensitive comparison and collapsed whitespace", () => {
    expect(normalizeNameForDuplicateComparison("  JAŃ   Kowalski ")).toBe("jań kowalski");
    expect(normalizeNameForDuplicateComparison("Wan der Meer")).toBe("wan der meer");
    expect(normalizeNameForDuplicateComparison("O'Connor-Smith")).toBe("o'connor-smith");
  });

  it("classifies exact duplicate despite name case and whitespace differences", () => {
    const candidate = registration({
      participantFirstName: "JAN",
      participantLastName: "  Kowalski  ",
    });

    expect(classifyRegistrationDuplicates([candidate], criteria)).toMatchObject({
      kind: "exact",
      registration: { id: candidate.id },
    });
  });

  it("classifies changed contact as probable instead of blocking", () => {
    const candidate = registration({ phone: "+48511111111" });
    expect(classifyRegistrationDuplicates([candidate], criteria)).toMatchObject({
      kind: "probable",
      registration: { id: candidate.id },
    });
  });

  it("does not treat another offering or another season as a duplicate", () => {
    expect(
      classifyRegistrationDuplicates(
        [registration({ offeringId: asOfferingId("gdynia-contemporary") })],
        criteria,
      ),
    ).toEqual({ kind: "none" });

    expect(
      classifyRegistrationDuplicates(
        [registration({ seasonId: asSeasonId("test-2027-2028") })],
        criteria,
      ),
    ).toEqual({ kind: "none" });
  });

  it("allows a fresh request after CANCELLED and future REJECTED statuses", () => {
    expect(
      classifyRegistrationDuplicates(
        [registration({ status: REGISTRATION_STATUS.cancelled })],
        criteria,
      ),
    ).toEqual({ kind: "none" });

    expect(
      classifyRegistrationDuplicates(
        [registration({ status: "REJECTED" as Registration["status"] })],
        criteria,
      ),
    ).toEqual({ kind: "none" });
  });

  it("never hard-blocks legacy records without birth date", () => {
    const legacy = registration({
      birthDate: null,
      seasonId: null,
      schemaVersion: 1,
    });

    expect(classifyRegistrationDuplicates([legacy], criteria)).toMatchObject({ kind: "probable" });
  });
});
