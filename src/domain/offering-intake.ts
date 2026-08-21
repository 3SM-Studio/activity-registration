import {
  INTAKE_STATE,
  PUBLIC_INTAKE_STATUS,
  REGISTRATION_MODE,
  type ClassOffering,
  type PublicIntakeStatus,
} from "@/domain/catalog";

export class OfferingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferingConfigurationError";
  }
}

export function validateOfferingConfiguration(offering: ClassOffering): void {
  if (offering.registrationMode === REGISTRATION_MODE.windowed) {
    if (!offering.registrationOpenFrom || !offering.registrationOpenTo) {
      throw new OfferingConfigurationError(
        `Offering ${offering.id} is WINDOWED but does not have a complete registration window.`,
      );
    }

    if (offering.registrationOpenFrom > offering.registrationOpenTo) {
      throw new OfferingConfigurationError(
        `Offering ${offering.id} has REGISTRATION_OPEN_FROM after REGISTRATION_OPEN_TO.`,
      );
    }
  }

  if (
    offering.registrationMode === REGISTRATION_MODE.rolling &&
    (offering.registrationOpenFrom || offering.registrationOpenTo)
  ) {
    throw new OfferingConfigurationError(
      `Offering ${offering.id} is ROLLING but has registration window dates configured.`,
    );
  }

  if (offering.intakeState === INTAKE_STATE.waitlistOnly && !offering.waitlistEnabled) {
    throw new OfferingConfigurationError(
      `Offering ${offering.id} is WAITLIST_ONLY but WAITLIST_ENABLED is false.`,
    );
  }
}

export function computeOfferingIntakeStatus(
  offering: ClassOffering,
  currentDate: string,
): PublicIntakeStatus {
  validateOfferingConfiguration(offering);

  if (!offering.active || offering.intakeState === INTAKE_STATE.closed) {
    return PUBLIC_INTAKE_STATUS.closed;
  }

  if (offering.registrationMode === REGISTRATION_MODE.windowed) {
    const openFrom = offering.registrationOpenFrom;
    const openTo = offering.registrationOpenTo;

    if (!openFrom || !openTo) {
      throw new OfferingConfigurationError(
        `Offering ${offering.id} has an incomplete registration window.`,
      );
    }

    if (currentDate < openFrom) {
      return PUBLIC_INTAKE_STATUS.upcoming;
    }

    if (currentDate > openTo) {
      return offering.waitlistEnabled
        ? PUBLIC_INTAKE_STATUS.waitlistOnly
        : PUBLIC_INTAKE_STATUS.closed;
    }
  }

  if (offering.intakeState === INTAKE_STATE.waitlistOnly) {
    return PUBLIC_INTAKE_STATUS.waitlistOnly;
  }

  return PUBLIC_INTAKE_STATUS.open;
}

export function offeringAcceptsRegistration(status: PublicIntakeStatus): boolean {
  return status === PUBLIC_INTAKE_STATUS.open || status === PUBLIC_INTAKE_STATUS.waitlistOnly;
}
