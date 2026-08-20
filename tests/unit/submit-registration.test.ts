import { beforeEach, describe, expect, it } from "vitest";

import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import { submitRegistration } from "@/application/submit-registration";
import {
  PUBLIC_INTAKE_STATUS,
  asCityId,
  asOfferingId,
  asSeasonId,
  type PublicCatalog,
  type Season,
  type SeasonId,
} from "@/domain/catalog";
import type {
  ApplicationRepositories,
  CatalogRepository,
  RegistrationRepository,
  SettingsRepository,
} from "@/domain/repositories";
import {
  isPotentialDuplicateCandidate,
  type RegistrationDuplicateCriteria,
} from "@/domain/registration-duplicates";
import type { Registration, RequestId } from "@/domain/registration";
import type { PublicSettings } from "@/domain/settings";

const currentSeason: Season = {
  id: asSeasonId("test-2026-2027"),
  name: "2026/2027",
  startDate: "2026-09-01",
  endDate: "2027-07-31",
  active: true,
  sortOrder: 10,
};

const publicCatalog: PublicCatalog = {
  cities: [{ id: asCityId("gdynia"), name: "Gdynia", sortOrder: 10 }],
  offerings: [
    {
      id: asOfferingId("gdynia-hiphop"),
      cityId: asCityId("gdynia"),
      name: "Hip-hop",
      publicDescription: null,
      sortOrder: 10,
      intakeStatus: PUBLIC_INTAKE_STATUS.open,
    },
  ],
};

class FakeCatalogRepository implements CatalogRepository {
  async getPublicCatalog() {
    return publicCatalog;
  }

  async findSeasonById(seasonId: SeasonId) {
    return seasonId === currentSeason.id ? currentSeason : null;
  }
}

class FakeSettingsRepository implements SettingsRepository {
  constructor(private readonly settings: PublicSettings) {}

  async getPublicSettings() {
    return this.settings;
  }
}

class FakeRegistrationRepository implements RegistrationRepository {
  readonly records: Registration[] = [];

  async findByRequestId(requestId: RequestId) {
    return this.records.find((record) => record.requestId === requestId) ?? null;
  }

  async findPotentialDuplicates(criteria: RegistrationDuplicateCriteria) {
    return this.records.filter((record) => isPotentialDuplicateCandidate(record, criteria));
  }

  async create(registration: Registration) {
    this.records.push(registration);
  }

  replaceFirstStatus(status: Registration["status"]) {
    const current = this.records[0];
    if (current) {
      this.records[0] = { ...current, status };
    }
  }
}

const baseRequest = {
  requestId: "11111111-1111-4111-8111-111111111111",
  cityId: "gdynia",
  offeringId: "gdynia-hiphop",
  participantFirstName: "Jan",
  participantLastName: "Kowalski",
  birthDate: "2000-01-15",
  phone: "500 000 000",
  email: "JAN@EXAMPLE.COM",
  renderedAt: Date.now() - 2_000,
  website: "",
};

function createRepositories(
  registrations: FakeRegistrationRepository,
  settings: Partial<PublicSettings> = {},
): ApplicationRepositories {
  return {
    catalog: new FakeCatalogRepository(),
    registrations,
    settings: new FakeSettingsRepository({
      registrationsOpen: true,
      currentSeasonId: currentSeason.id,
      formTitle: "Zapisy",
      successMessage: "Dziękujemy. Zgłoszenie zostało wysłane.",
      privacyNoticeUrl: "/privacy",
      privacyNoticeVersion: "v1",
      ...settings,
    }),
  };
}

describe("submitRegistration", () => {
  let registrations: FakeRegistrationRepository;

  beforeEach(() => {
    registrations = new FakeRegistrationRepository();
  });

  it("creates a normalized schema-v3 registration with season and snapshots", async () => {
    const result = await submitRegistration(baseRequest, {
      repositories: createRepositories(registrations),
      now: () => new Date("2026-08-18T12:00:00.000Z"),
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.businessDuplicate).toBe(false);
    expect(result.registration).toBe(registrations.records[0]);
    expect(registrations.records).toHaveLength(1);
    expect(registrations.records[0]).toMatchObject({
      requestId: baseRequest.requestId,
      seasonId: "test-2026-2027",
      seasonNameSnapshot: "2026/2027",
      cityIdSnapshot: "gdynia",
      cityNameSnapshot: "Gdynia",
      offeringNameSnapshot: "Hip-hop",
      birthDate: "2000-01-15",
      ageAtSubmission: 26,
      phone: "+48500000000",
      email: "jan@example.com",
      guardianFirstName: null,
      guardianLastName: null,
      assignedGroupId: null,
      contactedAt: null,
      confirmedAt: null,
      possibleDuplicateOf: null,
      schemaVersion: 3,
    });
  });

  it("returns the original registration for a transport retry", async () => {
    const repositories = createRepositories(registrations);

    const first = await submitRegistration(baseRequest, { repositories });
    const second = await submitRegistration(baseRequest, { repositories });

    expect(second).toEqual({
      registrationId: first.registrationId,
      idempotentReplay: true,
      businessDuplicate: false,
      registration: first.registration,
    });
    expect(registrations.records).toHaveLength(1);
  });

  it("rejects the same requestId with different logical data", async () => {
    const repositories = createRepositories(registrations);
    await submitRegistration(baseRequest, { repositories });

    await expect(
      submitRegistration({ ...baseRequest, participantFirstName: "Piotr" }, { repositories }),
    ).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.requestIdConflict,
    });
  });

  it("returns a safe exact business duplicate without appending another record", async () => {
    const repositories = createRepositories(registrations);
    const first = await submitRegistration(baseRequest, { repositories });
    const duplicate = await submitRegistration(
      {
        ...baseRequest,
        requestId: "22222222-2222-4222-8222-222222222222",
      },
      { repositories },
    );

    expect(duplicate).toMatchObject({
      registrationId: first.registrationId,
      idempotentReplay: false,
      businessDuplicate: true,
    });
    expect(registrations.records).toHaveLength(1);
  });

  it("appends a probable duplicate with a link to the earlier registration", async () => {
    const repositories = createRepositories(registrations);
    const first = await submitRegistration(baseRequest, { repositories });
    const probable = await submitRegistration(
      {
        ...baseRequest,
        requestId: "22222222-2222-4222-8222-222222222222",
        phone: "511 111 111",
      },
      { repositories },
    );

    expect(probable.businessDuplicate).toBe(false);
    expect(registrations.records).toHaveLength(2);
    expect(registrations.records[1]).toMatchObject({
      possibleDuplicateOf: first.registrationId,
      phone: "+48511111111",
    });
  });

  it("allows a fresh submission when a previous exact request was cancelled", async () => {
    const repositories = createRepositories(registrations);
    await submitRegistration(baseRequest, { repositories });
    registrations.replaceFirstStatus("CANCELLED");

    const next = await submitRegistration(
      {
        ...baseRequest,
        requestId: "22222222-2222-4222-8222-222222222222",
      },
      { repositories },
    );

    expect(next.businessDuplicate).toBe(false);
    expect(registrations.records).toHaveLength(2);
  });

  it("drops guardian data when birth date resolves to an adult", async () => {
    await submitRegistration(
      {
        ...baseRequest,
        guardianFirstName: "Stara wartość",
        guardianLastName: "Stara wartość",
      },
      { repositories: createRepositories(registrations) },
    );

    expect(registrations.records[0]?.guardianFirstName).toBeNull();
    expect(registrations.records[0]?.guardianLastName).toBeNull();
  });

  it("blocks production-like submission without privacy configuration", async () => {
    const repositories = createRepositories(registrations, {
      privacyNoticeUrl: null,
      privacyNoticeVersion: null,
    });

    await expect(
      submitRegistration(baseRequest, {
        repositories,
        requirePrivacyConfiguration: true,
      }),
    ).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.systemNotReady,
    });
  });

  it("fails closed when current season is not configured", async () => {
    const repositories = createRepositories(registrations, { currentSeasonId: null });

    await expect(submitRegistration(baseRequest, { repositories })).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.systemNotReady,
    });
    expect(registrations.records).toHaveLength(0);
  });

  it("fails closed when configured season is unavailable", async () => {
    const repositories: ApplicationRepositories = {
      ...createRepositories(registrations),
      settings: new FakeSettingsRepository({
        ...(await createRepositories(registrations).settings.getPublicSettings()),
        currentSeasonId: asSeasonId("missing-season"),
      }),
    };

    await expect(submitRegistration(baseRequest, { repositories })).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.systemNotReady,
    });
    expect(registrations.records).toHaveLength(0);
  });

  it("rejects an unavailable offering", async () => {
    const repositories: ApplicationRepositories = {
      ...createRepositories(registrations),
      catalog: {
        async getPublicCatalog() {
          return {
            cities: publicCatalog.cities,
            offerings: [],
          };
        },
        async findSeasonById(seasonId) {
          return seasonId === currentSeason.id ? currentSeason : null;
        },
      },
    };

    await expect(submitRegistration(baseRequest, { repositories })).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.offeringNotAvailable,
    });
  });

  it("rejects direct submission to a CLOSED offering", async () => {
    const repositories: ApplicationRepositories = {
      ...createRepositories(registrations),
      catalog: {
        async getPublicCatalog() {
          return {
            cities: publicCatalog.cities,
            offerings: publicCatalog.offerings.map((offering) => ({
              ...offering,
              intakeStatus: PUBLIC_INTAKE_STATUS.closed,
            })),
          };
        },
        async findSeasonById(seasonId) {
          return seasonId === currentSeason.id ? currentSeason : null;
        },
      },
    };

    await expect(submitRegistration(baseRequest, { repositories })).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.offeringNotAvailable,
    });
    expect(registrations.records).toHaveLength(0);
  });

  it("allows direct submission to a WAITLIST_ONLY offering", async () => {
    const repositories: ApplicationRepositories = {
      ...createRepositories(registrations),
      catalog: {
        async getPublicCatalog() {
          return {
            cities: publicCatalog.cities,
            offerings: publicCatalog.offerings.map((offering) => ({
              ...offering,
              intakeStatus: PUBLIC_INTAKE_STATUS.waitlistOnly,
            })),
          };
        },
        async findSeasonById(seasonId) {
          return seasonId === currentSeason.id ? currentSeason : null;
        },
      },
    };

    await expect(submitRegistration(baseRequest, { repositories })).resolves.toMatchObject({
      idempotentReplay: false,
      businessDuplicate: false,
    });
    expect(registrations.records).toHaveLength(1);
  });

  it("uses an application error for closed registrations before requiring a season", async () => {
    try {
      await submitRegistration(baseRequest, {
        repositories: createRepositories(registrations, {
          registrationsOpen: false,
          currentSeasonId: null,
        }),
      });
      throw new Error("Expected submitRegistration to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect(error).toMatchObject({
        code: APPLICATION_ERROR_CODE.registrationsClosed,
      });
    }
  });
});
