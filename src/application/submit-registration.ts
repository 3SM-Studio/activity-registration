import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import {
  PUBLIC_INTAKE_STATUS,
  asCityId,
  asOfferingId,
  type City,
  type InternalGroup,
  type PublicOffering,
} from "@/domain/catalog";
import { offeringAcceptsRegistration } from "@/domain/offering-intake";
import type { ApplicationRepositories } from "@/domain/repositories";
import {
  classifyRegistrationDuplicates,
  possibleDuplicateRegistrationId,
  type RegistrationDuplicateCriteria,
} from "@/domain/registration-duplicates";
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
  businessDuplicate: boolean;
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

function groupSupportsAge(group: InternalGroup, age: number): boolean {
  return (
    (group.ageMin === null || age >= group.ageMin) && (group.ageMax === null || age <= group.ageMax)
  );
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
  const currentDate = dateOnlyInPoland(nowDate);
  const ageAtSubmission = calculateAgeAtDate(birthDate, currentDate);
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

  const settings = await dependencies.repositories.settings.getPublicSettings();

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
      businessDuplicate: false,
      registration: existing,
    };
  }

  const season = await dependencies.repositories.catalog.findSeasonById(settings.currentSeasonId);
  if (!season || !season.active) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.systemNotReady,
      "Skonfigurowany sezon zapisów nie jest dostępny.",
    );
  }

  const catalog = await dependencies.repositories.catalog.getPublicCatalog(currentDate, season.id);
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

  const offeringId = asOfferingId(offering.id);
  const ageAtSeasonStart = calculateAgeAtDate(normalized.birthDate, season.startDate);
  const groups = await dependencies.repositories.catalog.findGroupsForOffering(
    season.id,
    offeringId,
  );
  const hasEligibleGroup = groups.some((group) => groupSupportsAge(group, ageAtSeasonStart));

  if (!hasEligibleGroup) {
    const message = "Dla wieku uczestnika nie ma obecnie aktywnej grupy w wybranych zajęciach.";
    throw new ApplicationError(APPLICATION_ERROR_CODE.participantAgeNotEligible, message, {
      fieldErrors: {
        birthDate: [message],
        offeringId: ["Wybierz zajęcia dostępne dla wieku uczestnika."],
      },
    });
  }

  const duplicateCriteria: RegistrationDuplicateCriteria = {
    seasonId: season.id,
    offeringId,
    cityId: asCityId(city.id),
    participantFirstName: normalized.participantFirstName,
    participantLastName: normalized.participantLastName,
    birthDate: normalized.birthDate,
    phone: normalized.phone,
    email: normalized.email,
  };
  const candidates =
    await dependencies.repositories.registrations.findPotentialDuplicates(duplicateCriteria);
  const duplicateMatch = classifyRegistrationDuplicates(candidates, duplicateCriteria);

  if (duplicateMatch.kind === "exact") {
    return {
      registrationId: duplicateMatch.registration.id,
      idempotentReplay: false,
      businessDuplicate: true,
      registration: duplicateMatch.registration,
    };
  }

  const now = nowDate.toISOString();
  const registration: Registration = {
    id: createRegistrationId(),
    requestId,
    submittedAt: now,
    seasonId: season.id,
    seasonNameSnapshot: season.name,
    offeringId,
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
    closedAt: null,
    possibleDuplicateOf: possibleDuplicateRegistrationId(duplicateMatch),
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
    businessDuplicate: false,
    registration,
  };
}
