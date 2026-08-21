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
import type { Registration, RequestId } from "@/domain/registration";
import {
  DEFAULT_FORM_TITLE,
  DEFAULT_SUCCESS_MESSAGE,
  type PublicSettings,
} from "@/domain/settings";

const currentSeason: Season = {
  id: asSeasonId("test-2026-2027"),
  name: "2026/2027",
  startDate: "2026-09-01",
  endDate: "2027-07-31",
  active: true,
  sortOrder: 10,
};

const allAges = [{ min: 0, max: 120 }] as const;

const catalog: PublicCatalog = {
  cities: [
    { id: asCityId("gdynia"), name: "Gdynia", sortOrder: 10 },
    { id: asCityId("sopot"), name: "Sopot", sortOrder: 20 },
  ],
  offerings: [
    {
      id: asOfferingId("gdynia-hiphop"),
      cityId: asCityId("gdynia"),
      name: "Hip-hop",
      publicDescription: null,
      sortOrder: 10,
      intakeStatus: PUBLIC_INTAKE_STATUS.open,
      ageRanges: allAges,
    },
    {
      id: asOfferingId("gdynia-contemporary"),
      cityId: asCityId("gdynia"),
      name: "Contemporary",
      publicDescription: null,
      sortOrder: 20,
      intakeStatus: PUBLIC_INTAKE_STATUS.open,
      ageRanges: allAges,
    },
    {
      id: asOfferingId("gdynia-taniec-wspolczesny"),
      cityId: asCityId("gdynia"),
      name: "Taniec współczesny",
      publicDescription: null,
      sortOrder: 30,
      intakeStatus: PUBLIC_INTAKE_STATUS.open,
      ageRanges: allAges,
    },
    {
      id: asOfferingId("sopot-hiphop"),
      cityId: asCityId("sopot"),
      name: "Hip-hop",
      publicDescription: null,
      sortOrder: 10,
      intakeStatus: PUBLIC_INTAKE_STATUS.open,
      ageRanges: allAges,
    },
    {
      id: asOfferingId("sopot-choreografia"),
      cityId: asCityId("sopot"),
      name: "Choreografia",
      publicDescription: null,
      sortOrder: 20,
      intakeStatus: PUBLIC_INTAKE_STATUS.open,
      ageRanges: allAges,
    },
  ],
};

const groups: readonly InternalGroup[] = catalog.offerings.map((offering, index) => ({
  id: asGroupId(`test-group-${index + 1}`),
  seasonId: currentSeason.id,
  offeringId: offering.id,
  name: `Test group ${index + 1}`,
  ageMin: 0,
  ageMax: 120,
  dayOfWeek: null,
  startTime: null,
  endTime: null,
  location: null,
  instructor: null,
  capacity: null,
  active: true,
  sortOrder: (index + 1) * 10,
}));

class MemoryCatalogRepository implements CatalogRepository {
  async getPublicCatalog(): Promise<PublicCatalog> {
    return catalog;
  }

  async findSeasonById(seasonId: SeasonId): Promise<Season | null> {
    return seasonId === currentSeason.id ? currentSeason : null;
  }

  async findGroupsForOffering(
    seasonId: SeasonId,
    offeringId: OfferingId,
  ): Promise<readonly InternalGroup[]> {
    return groups.filter((group) => group.seasonId === seasonId && group.offeringId === offeringId);
  }
}

class MemorySettingsRepository implements SettingsRepository {
  async getPublicSettings(): Promise<PublicSettings> {
    return {
      registrationsOpen: true,
      currentSeasonId: currentSeason.id,
      formTitle: DEFAULT_FORM_TITLE,
      successMessage: DEFAULT_SUCCESS_MESSAGE,
      privacyNoticeUrl: "/polityka-prywatnosci",
      privacyNoticeVersion: "test-v1",
    };
  }
}

const memoryStore = globalThis as typeof globalThis & {
  __activityRegistrations?: Registration[];
};

function getRegistrations(): Registration[] {
  memoryStore.__activityRegistrations ??= [];
  return memoryStore.__activityRegistrations;
}

class MemoryRegistrationRepository implements RegistrationRepository {
  async findByRequestId(requestId: RequestId): Promise<Registration | null> {
    return getRegistrations().find((registration) => registration.requestId === requestId) ?? null;
  }

  async findPotentialDuplicates(
    criteria: RegistrationDuplicateCriteria,
  ): Promise<readonly Registration[]> {
    return getRegistrations().filter((registration) =>
      isPotentialDuplicateCandidate(registration, criteria),
    );
  }

  async create(registration: Registration): Promise<void> {
    getRegistrations().push(registration);
  }
}

export function createMemoryRepositories(): ApplicationRepositories {
  return {
    catalog: new MemoryCatalogRepository(),
    registrations: new MemoryRegistrationRepository(),
    settings: new MemorySettingsRepository(),
  };
}
