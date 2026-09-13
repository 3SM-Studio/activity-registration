import type { ApplicationRepositories } from "@/domain/repositories";
import { CachedCatalogRepository } from "@/infrastructure/cached-catalog.repository";
import { GoogleSheetsCatalogRepository } from "@/infrastructure/google/catalog.repository";
import { GoogleSheetsNotificationOutboxRepository } from "@/infrastructure/google/notification-outbox.repository";
import { RegistrationDateSafeSheetsClient } from "@/infrastructure/google/registration-date-safe-sheets-client";
import { GoogleSheetsRegistrationRepository } from "@/infrastructure/google/registration.repository";
import { GoogleSheetsSettingsRepository } from "@/infrastructure/google/settings.repository";
import { GoogleSheetsClient } from "@/infrastructure/google/sheets-client";
import { createMemoryRepositories } from "@/infrastructure/memory/repositories";
import { getServerEnv } from "@/lib/env";

type CreateApplicationRepositoriesOptions = Readonly<{
  cacheCatalog?: boolean;
}>;

export function createApplicationRepositories(
  options: CreateApplicationRepositoriesOptions = {},
): ApplicationRepositories {
  const env = getServerEnv();

  if (env.DATA_BACKEND === "memory") {
    return createMemoryRepositories();
  }

  if (!env.GOOGLE_SPREADSHEET_ID) {
    throw new Error("GOOGLE_SPREADSHEET_ID is required.");
  }

  const client = new GoogleSheetsClient(env, env.GOOGLE_SPREADSHEET_ID);
  const registrationClient = new RegistrationDateSafeSheetsClient(client);
  const googleCatalog = new GoogleSheetsCatalogRepository(client);
  const catalog =
    options.cacheCatalog && env.APP_ENV === "production"
      ? new CachedCatalogRepository(
          googleCatalog,
          `${env.APP_ENV}:${env.DATA_BACKEND}:${env.GOOGLE_SPREADSHEET_ID}`,
        )
      : googleCatalog;

  return {
    catalog,
    registrations: new GoogleSheetsRegistrationRepository(registrationClient),
    settings: new GoogleSheetsSettingsRepository(client),
    notifications: new GoogleSheetsNotificationOutboxRepository(client),
  };
}
