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

describe("GoogleSheetsSettingsRepository", () => {
  it("reads public settings from the header contract", async () => {
    const repository = new GoogleSheetsSettingsRepository(
      createClient([
        ["KEY", "VALUE"],
        ["SYSTEM_SCHEMA_VERSION", "2"],
        ["REGISTRATIONS_OPEN", "TAK"],
        ["PUBLIC_FORM_TITLE", "Zapisy 2026"],
        ["SUCCESS_MESSAGE", "Gotowe"],
        ["PRIVACY_NOTICE_URL", "/privacy"],
        ["PRIVACY_NOTICE_VERSION", "2026-08-v1"],
      ]),
    );

    await expect(repository.getPublicSettings()).resolves.toEqual({
      registrationsOpen: true,
      formTitle: "Zapisy 2026",
      successMessage: "Gotowe",
      privacyNoticeUrl: "/privacy",
      privacyNoticeVersion: "2026-08-v1",
    });
  });

  it("fails fast when a settings key is duplicated", async () => {
    const repository = new GoogleSheetsSettingsRepository(
      createClient([
        ["KEY", "VALUE"],
        ["SYSTEM_SCHEMA_VERSION", "2"],
        ["REGISTRATIONS_OPEN", "TAK"],
        ["REGISTRATIONS_OPEN", "NIE"],
      ]),
    );

    await expect(repository.getPublicSettings()).rejects.toBeInstanceOf(SheetSchemaError);
  });

  it("rejects an unsupported system schema version", async () => {
    const repository = new GoogleSheetsSettingsRepository(
      createClient([
        ["KEY", "VALUE"],
        ["SYSTEM_SCHEMA_VERSION", "3"],
        ["REGISTRATIONS_OPEN", "TAK"],
        ["PUBLIC_FORM_TITLE", "Zapisy"],
        ["SUCCESS_MESSAGE", "Gotowe"],
        ["PRIVACY_NOTICE_URL", ""],
        ["PRIVACY_NOTICE_VERSION", ""],
      ]),
    );

    await expect(repository.getPublicSettings()).rejects.toThrow(
      /Unsupported SYSTEM_SCHEMA_VERSION/,
    );
  });
});
