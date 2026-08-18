import type { SettingsRepository } from "@/domain/repositories";
import {
  DEFAULT_FORM_TITLE,
  DEFAULT_SUCCESS_MESSAGE,
  type PublicSettings,
} from "@/domain/settings";
import { SheetSchemaError, cell, createHeaderMap } from "@/infrastructure/google/header-map";
import {
  SETTING_KEY,
  SETTINGS_HEADERS,
  SHEET,
  SYSTEM_SCHEMA_VERSION,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";
import { parseBooleanCell } from "@/infrastructure/google/parsers";

export class GoogleSheetsSettingsRepository implements SettingsRepository {
  constructor(private readonly client: SheetsClient) {}

  async getPublicSettings(): Promise<PublicSettings> {
    const rows = await this.client.getValues(`${SHEET.settings}!A:ZZ`);
    const headerRow = rows[0] ?? [];
    const headers = createHeaderMap(headerRow, SETTINGS_HEADERS);

    const settings = new Map<string, string>();

    for (const row of rows.slice(1)) {
      const key = cell(row, headers, "KEY");
      if (!key) {
        continue;
      }

      if (settings.has(key)) {
        throw new SheetSchemaError(`Duplicate setting key: ${key}`);
      }

      settings.set(key, cell(row, headers, "VALUE"));
    }

    const missingKeys = Object.values(SETTING_KEY).filter((key) => !settings.has(key));
    if (missingKeys.length > 0) {
      throw new SheetSchemaError(`Missing required setting keys: ${missingKeys.join(", ")}`);
    }

    const systemSchemaVersion = settings.get(SETTING_KEY.systemSchemaVersion);
    if (systemSchemaVersion !== String(SYSTEM_SCHEMA_VERSION)) {
      throw new SheetSchemaError(
        `Unsupported SYSTEM_SCHEMA_VERSION: ${systemSchemaVersion ?? "<missing>"}`,
      );
    }

    const privacyNoticeUrl = settings.get(SETTING_KEY.privacyNoticeUrl)?.trim() || null;
    const privacyNoticeVersion = settings.get(SETTING_KEY.privacyNoticeVersion)?.trim() || null;

    return {
      registrationsOpen: parseBooleanCell(settings.get(SETTING_KEY.registrationsOpen) ?? ""),
      formTitle: settings.get(SETTING_KEY.publicFormTitle)?.trim() || DEFAULT_FORM_TITLE,
      successMessage: settings.get(SETTING_KEY.successMessage)?.trim() || DEFAULT_SUCCESS_MESSAGE,
      privacyNoticeUrl,
      privacyNoticeVersion,
    };
  }
}
