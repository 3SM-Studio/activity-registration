import type { PublicCatalog, Season, SeasonId } from "@/domain/catalog";
import type { RegistrationDuplicateCriteria } from "@/domain/registration-duplicates";
import type { Registration, RequestId } from "@/domain/registration";
import type { PublicSettings } from "@/domain/settings";

export interface CatalogRepository {
  getPublicCatalog(currentDate: string): Promise<PublicCatalog>;
  findSeasonById(seasonId: SeasonId): Promise<Season | null>;
}

export interface RegistrationRepository {
  findByRequestId(requestId: RequestId): Promise<Registration | null>;
  findPotentialDuplicates(
    criteria: RegistrationDuplicateCriteria,
  ): Promise<readonly Registration[]>;
  create(registration: Registration): Promise<void>;
}

export interface SettingsRepository {
  getPublicSettings(): Promise<PublicSettings>;
}

export type ApplicationRepositories = Readonly<{
  catalog: CatalogRepository;
  registrations: RegistrationRepository;
  settings: SettingsRepository;
}>;
