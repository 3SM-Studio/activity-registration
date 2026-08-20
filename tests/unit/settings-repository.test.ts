import { describe, expect, it } from "vitest";

import { SheetSchemaError } from "@/infrastructure/google/header-map";
import { GoogleSheetsSettingsRepository } from "@/infrastructure/google/settings.repository";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

function createClient(values: readonly (readonly unknown[])[]): SheetsClient {
  return {
    async getValues() {
      return values;
    },
    async updateValues() {},
    async appendValues() {},
    async appendTableRow() {},
    async clearValues() {},
    async getSheetMetadata() {
      return [];
    },
    async batchUpdate() {},
  };
}

function validSettings(overrides: Readonly<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    SYSTEM_SCHEMA_VERSION: "3",
    REGISTRATIONS_OPEN: "TAK",
    CURRENT_SEASON_ID: "test-2026-2027",
    PUBLIC_FORM_TITLE: "Zapisy 2026",
    SUCCESS_MESSAGE: "Gotowe",
    PRIVACY_NOTICE_URL: "/privacy",
    PRIVACY_NOTICE_VERSION: "2026-08-v1",
    ...overrides,
  };

  return [["KEY", "VALUE"], ...Object.entries(values)] as const;
}

describe("GoogleSheetsSettingsRepository", () => {
  it("reads public settings from the header contract", async () => {
    const repository = new GoogleSheetsSettingsRepository(createClient(validSettings()));

    await expect(repository.getPublicSettings()).resolves.toEqual({
      registrationsOpen: true,
      currentSeasonId: "test-2026-2027",
      formTitle: "Zapisy 2026",
      successMessage: "Gotowe",
      privacyNoticeUrl: "/privacy",
      privacyNoticeVersion: "2026-08-v1",
    });
  });

  it("fails fast when a settings key is duplicated", async () => {
    const rows = [...validSettings(), ["REGISTRATIONS_OPEN", "NIE"]] as const;
    const repository = new GoogleSheetsSettingsRepository(createClient(rows));

    await expect(repository.getPublicSettings()).rejects.toBeInstanceOf(SheetSchemaError);
  });

  it("rejects an unsupported system schema version", async () => {
    const repository = new GoogleSheetsSettingsRepository(
      createClient(validSettings({ SYSTEM_SCHEMA_VERSION: "4" })),
    );

    await expect(repository.getPublicSettings()).rejects.toThrow(
      /Unsupported SYSTEM_SCHEMA_VERSION/,
    );
  });
});
