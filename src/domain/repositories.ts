import type { PublicCatalog } from "@/domain/catalog";
import type { Registration, RequestId } from "@/domain/registration";
import type { PublicSettings } from "@/domain/settings";

export interface CatalogRepository {
  getPublicCatalog(): Promise<PublicCatalog>;
}

export interface RegistrationRepository {
  findByRequestId(requestId: RequestId): Promise<Registration | null>;
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
