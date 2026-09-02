import { beforeEach, describe, expect, it } from "vitest";

import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import { submitRegistration } from "@/application/submit-registration";
import {
  PUBLIC_INTAKE_STATUS,
  asCityId,
  asGroupId,
  asOfferingId,
  asSeasonId,
  type InternalGroup,
  type OfferingId,
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
import {
  AGE_REVIEW_NOTE,
  REGISTRATION_STATUS,
  type Registration,
  type RequestId,
} from "@/domain/registration";
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
      ageRanges: [{ min: 0, max: 120 }],
    },
  ],
};

const defaultGroup: InternalGroup = {
  id: asGroupId("test-group"),
  seasonId: currentSeason.id,
  offeringId: asOfferingId("gdynia-hiphop"),
  name: "Test group",
  ageMin: 0,
  ageMax: 120,
  dayOfWeek: null,
  startTime: null,
  endTime: null,
  location: null,
  instructor: null,
  capacity: 20,
  active: true,
  sortOrder: 10,
};

class FakeCatalogRepository implements CatalogRepository {
  constructor(
    private readonly catalog: PublicCatalog = publicCatalog,
    private readonly groups: readonly InternalGroup[] = [defaultGroup],
    private readonly season: Season | null = currentSeason,
  ) {}

  async getPublicCatalog() {
    return this.catalog;
  }

  async findSeasonById(seasonId: SeasonId) {
    return this.season?.id === seasonId ? this.season : null;
  }

  async findGroupsForOffering(seasonId: SeasonId, offeringId: OfferingId) {
    return this.groups.filter(
      (group) => group.seasonId === seasonId && group.offeringId === offeringId && group.active,
    );
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
  catalog: CatalogRepository = new FakeCatalogRepository(),
): ApplicationRepositories {
  return {
    catalog,
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

  it("creates a normalized schema-v4 registration with season and snapshots", async () => {
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
      closedAt: null,
      possibleDuplicateOf: null,
      schemaVersion: 4,
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
    ).rejects.toMatchObject({ code: APPLICATION_ERROR_CODE.requestIdConflict });
  });

  it("returns a safe exact business duplicate without appending another record", async () => {
    const repositories = createRepositories(registrations);
    const first = await submitRegistration(baseRequest, { repositories });
    const duplicate = await submitRegistration(
      { ...baseRequest, requestId: "22222222-2222-4222-8222-222222222222" },
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
    registrations.replaceFirstStatus(REGISTRATION_STATUS.cancelled);

    const next = await submitRegistration(
      { ...baseRequest, requestId: "22222222-2222-4222-8222-222222222222" },
      { repositories },
    );

    expect(next.businessDuplicate).toBe(false);
    expect(registrations.records).toHaveLength(2);
  });

  it("drops guardian data when birth date resolves to an adult", async () => {
    await submitRegistration(
      { ...baseRequest, guardianFirstName: "Stara wartość", guardianLastName: "Stara wartość" },
      { repositories: createRepositories(registrations) },
    );

    expect(registrations.records[0]?.guardianFirstName).toBeNull();
    expect(registrations.records[0]?.guardianLastName).toBeNull();
  });

  it("accepts an age outside the standard group range and flags it for operator review", async () => {
    const youthGroup: InternalGroup = {
      ...defaultGroup,
      ageMin: 13,
      ageMax: 18,
    };
    const catalog = new FakeCatalogRepository(publicCatalog, [youthGroup]);

    const result = await submitRegistration(baseRequest, {
      repositories: createRepositories(registrations, {}, catalog),
      now: () => new Date("2026-08-18T12:00:00.000Z"),
    });

    expect(result.businessDuplicate).toBe(false);
    expect(result.registration.status).toBe(REGISTRATION_STATUS.new);
    expect(result.registration.notes).toBe(AGE_REVIEW_NOTE);
    expect(registrations.records).toHaveLength(1);
  });

  it("accepts a child who reaches the group's minimum age by season start", async () => {
    const youthGroup: InternalGroup = {
      ...defaultGroup,
      ageMin: 7,
      ageMax: 9,
    };
    const catalog = new FakeCatalogRepository(publicCatalog, [youthGroup]);
    const request = {
      ...baseRequest,
      birthDate: "2019-08-25",
      guardianFirstName: "Anna",
      guardianLastName: "Kowalska",
    };

    await expect(
      submitRegistration(request, {
        repositories: createRepositories(registrations, {}, catalog),
        now: () => new Date("2026-08-18T12:00:00.000Z"),
      }),
    ).resolves.toMatchObject({ businessDuplicate: false });
  });

  it("blocks production-like submission without privacy configuration", async () => {
    const repositories = createRepositories(registrations, {
      privacyNoticeUrl: null,
      privacyNoticeVersion: null,
    });

    await expect(
      submitRegistration(baseRequest, { repositories, requirePrivacyConfiguration: true }),
    ).rejects.toMatchObject({ code: APPLICATION_ERROR_CODE.systemNotReady });
  });

  it("fails closed when current season is not configured", async () => {
    const repositories = createRepositories(registrations, { currentSeasonId: null });
    await expect(submitRegistration(baseRequest, { repositories })).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.systemNotReady,
    });
    expect(registrations.records).toHaveLength(0);
  });

  it("fails closed when configured season is unavailable", async () => {
    const repositories = createRepositories(
      registrations,
      { currentSeasonId: asSeasonId("missing-season") },
      new FakeCatalogRepository(publicCatalog, [defaultGroup], null),
    );

    await expect(submitRegistration(baseRequest, { repositories })).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.systemNotReady,
    });
    expect(registrations.records).toHaveLength(0);
  });

  it("rejects an unavailable offering", async () => {
    const catalog = new FakeCatalogRepository({ cities: publicCatalog.cities, offerings: [] });
    await expect(
      submitRegistration(baseRequest, {
        repositories: createRepositories(registrations, {}, catalog),
      }),
    ).rejects.toMatchObject({ code: APPLICATION_ERROR_CODE.offeringNotAvailable });
  });

  it("rejects direct submission to a CLOSED offering", async () => {
    const catalog = new FakeCatalogRepository({
      cities: publicCatalog.cities,
      offerings: publicCatalog.offerings.map((offering) => ({
        ...offering,
        intakeStatus: PUBLIC_INTAKE_STATUS.closed,
      })),
    });

    await expect(
      submitRegistration(baseRequest, {
        repositories: createRepositories(registrations, {}, catalog),
      }),
    ).rejects.toMatchObject({ code: APPLICATION_ERROR_CODE.offeringNotAvailable });
    expect(registrations.records).toHaveLength(0);
  });

  it("starts a direct WAITLIST_ONLY submission in NEW for operator review", async () => {
    const catalog = new FakeCatalogRepository({
      cities: publicCatalog.cities,
      offerings: publicCatalog.offerings.map((offering) => ({
        ...offering,
        intakeStatus: PUBLIC_INTAKE_STATUS.waitlistOnly,
      })),
    });

    const result = await submitRegistration(baseRequest, {
      repositories: createRepositories(registrations, {}, catalog),
    });
    expect(result.registration.status).toBe(REGISTRATION_STATUS.new);
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
      expect(error).toMatchObject({ code: APPLICATION_ERROR_CODE.registrationsClosed });
    }
  });
});
