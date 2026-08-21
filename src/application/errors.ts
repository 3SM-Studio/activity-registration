export const APPLICATION_ERROR_CODE = {
  validation: "VALIDATION_ERROR",
  registrationsClosed: "REGISTRATIONS_CLOSED",
  systemNotReady: "SYSTEM_NOT_READY",
  cityNotAvailable: "CITY_NOT_AVAILABLE",
  offeringNotAvailable: "OFFERING_NOT_AVAILABLE",
  offeringCityMismatch: "OFFERING_CITY_MISMATCH",
  participantAgeNotEligible: "PARTICIPANT_AGE_NOT_ELIGIBLE",
  requestIdConflict: "REQUEST_ID_CONFLICT",
  temporaryUnavailable: "TEMPORARY_UNAVAILABLE",
  internal: "INTERNAL_ERROR",
} as const;

export type ApplicationErrorCode =
  (typeof APPLICATION_ERROR_CODE)[keyof typeof APPLICATION_ERROR_CODE];

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;

  constructor(
    code: ApplicationErrorCode,
    message: string,
    options: { fieldErrors?: Readonly<Record<string, readonly string[] | undefined>> } = {},
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    if (options.fieldErrors) {
      this.fieldErrors = options.fieldErrors;
    }
  }
}
