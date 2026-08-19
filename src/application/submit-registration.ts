import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import {
  PUBLIC_INTAKE_STATUS,
  asCityId,
  asOfferingId,
  type City,
  type PublicOffering,
} from "@/domain/catalog";
import { offeringAcceptsRegistration } from "@/domain/offering-intake";
import type { ApplicationRepositories } from "@/domain/repositories";
import {
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  asRequestId,
  type Registration,
} from "@/domain/registration";
import { calculateAgeAtDate, dateOnlyInPoland } from "@/lib/birth-date";
import { normalizeEmail } from "@/lib/email";
import { createRegistrationId } from "@/lib/ids";
import { InvalidPhoneError, normalizePhone } from "@/lib/phone";
import { registrationRequestSchema } from "@/validation/registration.schema";

const MINIMUM_FORM_FILL_TIME_MS = 800;

export type SubmitRegistrationDependencies = Readonly<{
  repositories: ApplicationRepositories;
  now?: () => Date;
  requirePrivacyConfiguration?: boolean;
}>;

export type SubmitRegistrationResult = Readonly<{
  registrationId: string;
  idempotentReplay: boolean;
  registration: Registration;
}>;

function normalizeOptionalName(value: string | undefined): string | null {
  return value?.trim() || null;
}

function sameLogicalRequest(
  existing: Registration,
  input: {
    cityId: string;
    offeringId: string;
    participantFirstName: string;
    participantLastName: string;
    birthDate: string;
    ageAtSubmission: number;
    guardianFirstName: string | null;
    guardianLastName: string | null;
    phone: string;
    email: string;
  },
): boolean {
  return (
    existing.cityIdSnapshot === input.cityId &&
    existing.offeringId === input.offeringId &&
    existing.participantFirstName === input.participantFirstName &&
    existing.participantLastName === input.participantLastName &&
    existing.birthDate === input.birthDate &&
    existing.ageAtSubmission === input.ageAtSubmission &&
    existing.guardianFirstName === input.guardianFirstName &&
    existing.guardianLastName === input.guardianLastName &&
    existing.phone === input.phone &&
    existing.email === input.email
  );
}

function findCity(
  cities: readonly Pick<City, "id" | "name">[],
  cityId: string,
): Pick<City, "id" | "name"> | null {
  return cities.find((city) => city.id === cityId) ?? null;
}

function findOffering(
  offerings: readonly PublicOffering[],
  offeringId: string,
): PublicOffering | null {
  return offerings.find((offering) => offering.id === offeringId) ?? null;
}

function unavailableOfferingMessage(offering: PublicOffering): string {
  if (offering.intakeStatus === PUBLIC_INTAKE_STATUS.upcoming) {
    return "Zapisy na wybrane zajęcia jeszcze się nie rozpoczęły.";
  }

  return "Zapisy na wybrane zajęcia są obecnie zamknięte.";
}

export async function submitRegistration(
  rawInput: unknown,
  dependencies: SubmitRegistrationDependencies,
): Promise<SubmitRegistrationResult> {
  const parsed = registrationRequestSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new ApplicationError(APPLICATION_ERROR_CODE.validation, "Sprawdź zaznaczone pola.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const nowDate = (dependencies.now ?? (() => new Date()))();

  const elapsedSinceRender = nowDate.getTime() - input.renderedAt;
  if (elapsedSinceRender >= 0 && elapsedSinceRender < MINIMUM_FORM_FILL_TIME_MS) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.validation,
      "Formularz został wysłany zbyt szybko.",
    );
  }

  let phone: string;
  try {
    phone = normalizePhone(input.phone);
  } catch (error) {
    if (error instanceof InvalidPhoneError) {
      throw new ApplicationError(APPLICATION_ERROR_CODE.validation, error.message, {
        fieldErrors: { phone: [error.message] },
      });
    }
    throw error;
  }

  const birthDate = input.birthDate.trim();
  const ageAtSubmission = calculateAgeAtDate(birthDate, dateOnlyInPoland(nowDate));
  const normalized = {
    cityId: input.cityId,
    offeringId: input.offeringId,
    participantFirstName: input.participantFirstName.trim(),
    participantLastName: input.participantLastName.trim(),
    birthDate,
    ageAtSubmission,
    guardianFirstName: ageAtSubmission < 18 ? normalizeOptionalName(input.guardianFirstName) : null,
    guardianLastName: ageAtSubmission < 18 ? normalizeOptionalName(input.guardianLastName) : null,
    phone,
    email: normalizeEmail(input.email),
  };

  const requestId = asRequestId(input.requestId);
  const existing = await dependencies.repositories.registrations.findByRequestId(requestId);

  if (existing) {
    if (!sameLogicalRequest(existing, normalized)) {
      throw new ApplicationError(
        APPLICATION_ERROR_CODE.requestIdConflict,
        "Formularz został zmieniony po wcześniejszej próbie wysłania. Spróbuj ponownie.",
      );
    }

    return {
      registrationId: existing.id,
      idempotentReplay: true,
      registration: existing,
    };
  }

  const currentDate = dateOnlyInPoland(nowDate);
  const [catalog, settings] = await Promise.all([
    dependencies.repositories.catalog.getPublicCatalog(currentDate),
    dependencies.repositories.settings.getPublicSettings(),
  ]);

  if (!settings.registrationsOpen) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.registrationsClosed,
      "Zapisy są obecnie zamknięte.",
    );
  }

  if (
    dependencies.requirePrivacyConfiguration &&
    (!settings.privacyNoticeUrl || !settings.privacyNoticeVersion)
  ) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.systemNotReady,
      "System zapisów nie jest jeszcze gotowy do pracy produkcyjnej.",
    );
  }

  if (!settings.currentSeasonId) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.systemNotReady,
      "System zapisów nie ma skonfigurowanego bieżącego sezonu.",
    );
  }

  const season = await dependencies.repositories.catalog.findSeasonById(settings.currentSeasonId);
  if (!season || !season.active) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.systemNotReady,
      "Skonfigurowany sezon zapisów nie jest dostępny.",
    );
  }

  const city = findCity(catalog.cities, normalized.cityId);
  if (!city) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.cityNotAvailable,
      "Wybrane miasto nie jest już dostępne.",
    );
  }

  const offering = findOffering(catalog.offerings, normalized.offeringId);
  if (!offering) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.offeringNotAvailable,
      "Wybrane zajęcia nie są już dostępne.",
    );
  }

  if (offering.cityId !== city.id) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.offeringCityMismatch,
      "Wybrane zajęcia nie należą do wybranego miasta.",
    );
  }

  if (!offeringAcceptsRegistration(offering.intakeStatus)) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.offeringNotAvailable,
      unavailableOfferingMessage(offering),
    );
  }

  const now = nowDate.toISOString();
  const registration: Registration = {
    id: createRegistrationId(),
    requestId,
    submittedAt: now,
    seasonId: season.id,
    seasonNameSnapshot: season.name,
    offeringId: asOfferingId(offering.id),
    cityIdSnapshot: asCityId(city.id),
    cityNameSnapshot: city.name,
    offeringNameSnapshot: offering.name,
    participantFirstName: normalized.participantFirstName,
    participantLastName: normalized.participantLastName,
    birthDate: normalized.birthDate,
    ageAtSubmission: normalized.ageAtSubmission,
    guardianFirstName: normalized.guardianFirstName,
    guardianLastName: normalized.guardianLastName,
    phone: normalized.phone,
    email: normalized.email,
    status: REGISTRATION_STATUS.new,
    assignedGroupId: null,
    contactedAt: null,
    confirmedAt: null,
    possibleDuplicateOf: null,
    notes: "",
    privacyNoticeVersion: settings.privacyNoticeVersion ?? "unconfigured",
    source: REGISTRATION_SOURCE.web,
    createdAt: now,
    updatedAt: now,
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
  };

  await dependencies.repositories.registrations.create(registration);

  return {
    registrationId: registration.id,
    idempotentReplay: false,
    registration,
  };
}
