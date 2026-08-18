import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import type { City, ClassOffering } from "@/domain/catalog";
import { asCityId, asOfferingId } from "@/domain/catalog";
import type { ApplicationRepositories } from "@/domain/repositories";
import {
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  asRequestId,
  type Registration,
} from "@/domain/registration";
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
    age: number;
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
    existing.age === input.age &&
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
  offerings: readonly Pick<ClassOffering, "id" | "cityId" | "name">[],
  offeringId: string,
): Pick<ClassOffering, "id" | "cityId" | "name"> | null {
  return offerings.find((offering) => offering.id === offeringId) ?? null;
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

  const elapsedSinceRender = Date.now() - input.renderedAt;
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

  const normalized = {
    cityId: input.cityId,
    offeringId: input.offeringId,
    participantFirstName: input.participantFirstName.trim(),
    participantLastName: input.participantLastName.trim(),
    age: input.age,
    guardianFirstName: input.age < 18 ? normalizeOptionalName(input.guardianFirstName) : null,
    guardianLastName: input.age < 18 ? normalizeOptionalName(input.guardianLastName) : null,
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

  const [catalog, settings] = await Promise.all([
    dependencies.repositories.catalog.getPublicCatalog(),
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

  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const registration: Registration = {
    id: createRegistrationId(),
    requestId,
    submittedAt: now,
    offeringId: asOfferingId(offering.id),
    cityIdSnapshot: asCityId(city.id),
    cityNameSnapshot: city.name,
    offeringNameSnapshot: offering.name,
    participantFirstName: normalized.participantFirstName,
    participantLastName: normalized.participantLastName,
    age: normalized.age,
    guardianFirstName: normalized.guardianFirstName,
    guardianLastName: normalized.guardianLastName,
    phone: normalized.phone,
    email: normalized.email,
    status: REGISTRATION_STATUS.new,
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
