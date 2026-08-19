import { describe, expect, it } from "vitest";

import {
  LEGACY_REGISTRATION_STATUS,
  normalizeStoredRegistrationStatus,
  REGISTRATION_STATUS,
} from "@/domain/registration";

describe("registration workflow statuses", () => {
  it("defines the seven operator workflow states", () => {
    expect(Object.values(REGISTRATION_STATUS)).toEqual([
      "NEW",
      "IN_REVIEW",
      "CONTACTED",
      "WAITLISTED",
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
    ]);
  });

  it("normalizes retired status values during the migration window", () => {
    expect(normalizeStoredRegistrationStatus(LEGACY_REGISTRATION_STATUS.inProgress)).toBe(
      REGISTRATION_STATUS.inReview,
    );
    expect(normalizeStoredRegistrationStatus(LEGACY_REGISTRATION_STATUS.accepted)).toBe(
      REGISTRATION_STATUS.confirmed,
    );
  });

  it("keeps current values and rejects unknown values", () => {
    for (const status of Object.values(REGISTRATION_STATUS)) {
      expect(normalizeStoredRegistrationStatus(status)).toBe(status);
    }
    expect(normalizeStoredRegistrationStatus("UNKNOWN")).toBeNull();
  });
});
