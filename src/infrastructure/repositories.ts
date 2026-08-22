import type { ApplicationRepositories } from "@/domain/repositories";
import { GoogleSheetsCatalogRepository } from "@/infrastructure/google/catalog.repository";
import { GoogleSheetsNotificationOutboxRepository } from "@/infrastructure/google/notification-outbox.repository";
import { GoogleSheetsRegistrationRepository } from "@/infrastructure/google/registration.repository";
import { GoogleSheetsSettingsRepository } from "@/infrastructure/google/settings.repository";
import { GoogleSheetsClient } from "@/infrastructure/google/sheets-client";
import { createMemoryRepositories } from "@/infrastructure/memory/repositories";
import { getServerEnv } from "@/lib/env";

export function createApplicationRepositories(): ApplicationRepositories {
  const env = getServerEnv();

  if (env.DATA_BACKEND === "memory") {
    return createMemoryRepositories();
  }

  if (!env.GOOGLE_SPREADSHEET_ID) {
    throw new Error("GOOGLE_SPREADSHEET_ID is required.");
  }

  const client = new GoogleSheetsClient(env, env.GOOGLE_SPREADSHEET_ID);

  return {
    catalog: new GoogleSheetsCatalogRepository(client),
    registrations: new GoogleSheetsRegistrationRepository(client),
    settings: new GoogleSheetsSettingsRepository(client),
    notifications: new GoogleSheetsNotificationOutboxRepository(client),
  };
}
