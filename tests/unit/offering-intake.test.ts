import { describe, expect, it } from "vitest";

import {
  INTAKE_STATE,
  PUBLIC_INTAKE_STATUS,
  REGISTRATION_MODE,
  asCityId,
  asOfferingId,
  type ClassOffering,
} from "@/domain/catalog";
import {
  OfferingConfigurationError,
  computeOfferingIntakeStatus,
  offeringAcceptsRegistration,
  validateOfferingConfiguration,
} from "@/domain/offering-intake";

function offering(overrides: Partial<ClassOffering> = {}): ClassOffering {
  return {
    id: asOfferingId("gdynia-hiphop"),
    cityId: asCityId("gdynia"),
    name: "Hip-hop",
    publicDescription: null,
    active: true,
    sortOrder: 10,
    registrationMode: REGISTRATION_MODE.rolling,
    intakeState: INTAKE_STATE.open,
    registrationOpenFrom: null,
    registrationOpenTo: null,
    waitlistEnabled: false,
    ...overrides,
  };
}

describe("offering intake", () => {
  it("keeps a rolling OPEN offering open", () => {
    expect(computeOfferingIntakeStatus(offering(), "2026-08-19")).toBe(
      PUBLIC_INTAKE_STATUS.open,
    );
  });

  it("honors manual CLOSED for rolling intake", () => {
    expect(
      computeOfferingIntakeStatus(
        offering({ intakeState: INTAKE_STATE.closed }),
        "2026-08-19",
      ),
    ).toBe(PUBLIC_INTAKE_STATUS.closed);
  });

  it("supports rolling WAITLIST_ONLY when waitlist is enabled", () => {
    expect(
      computeOfferingIntakeStatus(
        offering({ intakeState: INTAKE_STATE.waitlistOnly, waitlistEnabled: true }),
        "2026-08-19",
      ),
    ).toBe(PUBLIC_INTAKE_STATUS.waitlistOnly);
  });

  it("returns UPCOMING before a windowed registration period", () => {
    expect(
      computeOfferingIntakeStatus(
        offering({
          registrationMode: REGISTRATION_MODE.windowed,
          registrationOpenFrom: "2026-09-01",
          registrationOpenTo: "2026-09-30",
        }),
        "2026-08-31",
      ),
    ).toBe(PUBLIC_INTAKE_STATUS.upcoming);
  });

  it("treats both window boundaries as inclusive", () => {
    const windowed = offering({
      registrationMode: REGISTRATION_MODE.windowed,
      registrationOpenFrom: "2026-09-01",
      registrationOpenTo: "2026-09-30",
    });

    expect(computeOfferingIntakeStatus(windowed, "2026-09-01")).toBe(
      PUBLIC_INTAKE_STATUS.open,
    );
    expect(computeOfferingIntakeStatus(windowed, "2026-09-30")).toBe(
      PUBLIC_INTAKE_STATUS.open,
    );
  });

  it("returns CLOSED after a windowed registration period", () => {
    expect(
      computeOfferingIntakeStatus(
        offering({
          registrationMode: REGISTRATION_MODE.windowed,
          registrationOpenFrom: "2026-09-01",
          registrationOpenTo: "2026-09-30",
        }),
        "2026-10-01",
      ),
    ).toBe(PUBLIC_INTAKE_STATUS.closed);
  });

  it("keeps manual WAITLIST_ONLY inside a valid window", () => {
    expect(
      computeOfferingIntakeStatus(
        offering({
          registrationMode: REGISTRATION_MODE.windowed,
          intakeState: INTAKE_STATE.waitlistOnly,
          registrationOpenFrom: "2026-09-01",
          registrationOpenTo: "2026-09-30",
          waitlistEnabled: true,
        }),
        "2026-09-15",
      ),
    ).toBe(PUBLIC_INTAKE_STATUS.waitlistOnly);
  });

  it("rejects incomplete or reversed WINDOWED configuration", () => {
    expect(() =>
      validateOfferingConfiguration(
        offering({
          registrationMode: REGISTRATION_MODE.windowed,
          registrationOpenFrom: "2026-09-01",
          registrationOpenTo: null,
        }),
      ),
    ).toThrow(OfferingConfigurationError);

    expect(() =>
      validateOfferingConfiguration(
        offering({
          registrationMode: REGISTRATION_MODE.windowed,
          registrationOpenFrom: "2026-10-01",
          registrationOpenTo: "2026-09-01",
        }),
      ),
    ).toThrow(/REGISTRATION_OPEN_FROM after REGISTRATION_OPEN_TO/);
  });

  it("rejects registration-window dates on ROLLING offerings", () => {
    expect(() =>
      validateOfferingConfiguration(
        offering({ registrationOpenFrom: "2026-09-01", registrationOpenTo: "2026-09-30" }),
      ),
    ).toThrow(/ROLLING/);
  });

  it("rejects WAITLIST_ONLY when the waitlist is disabled", () => {
    expect(() =>
      validateOfferingConfiguration(offering({ intakeState: INTAKE_STATE.waitlistOnly })),
    ).toThrow(/WAITLIST_ENABLED/);
  });

  it("never accepts inactive offerings and only accepts OPEN or WAITLIST_ONLY statuses", () => {
    expect(computeOfferingIntakeStatus(offering({ active: false }), "2026-08-19")).toBe(
      PUBLIC_INTAKE_STATUS.closed,
    );

    expect(offeringAcceptsRegistration(PUBLIC_INTAKE_STATUS.open)).toBe(true);
    expect(offeringAcceptsRegistration(PUBLIC_INTAKE_STATUS.waitlistOnly)).toBe(true);
    expect(offeringAcceptsRegistration(PUBLIC_INTAKE_STATUS.upcoming)).toBe(false);
    expect(offeringAcceptsRegistration(PUBLIC_INTAKE_STATUS.closed)).toBe(false);
  });
});
