import { describe, expect, it } from "vitest";

import { GoogleSheetsCatalogRepository } from "@/infrastructure/google/catalog.repository";
import { SHEET, SHEET_SCHEMA } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

function offeringRow(
  id: string,
  cityId: string,
  name: string,
  active: string,
  sortOrder: number,
): readonly unknown[] {
  return [id, cityId, name, "", active, sortOrder, "ROLLING", "OPEN", "", "", "FALSE"];
}

function createClient(): SheetsClient {
  const values = new Map<string, readonly (readonly unknown[])[]>([
    [
      `${SHEET.cities}!A:ZZ`,
      [
        SHEET_SCHEMA[SHEET.cities],
        ["gdynia", "Gdynia", "TAK", 10],
        ["sopot", "Sopot", "TAK", 20],
        ["gdansk", "Gdańsk", "TAK", 30],
        ["inactive-city", "Nieaktywne", "NIE", 40],
      ],
    ],
    [
      `${SHEET.offerings}!A:ZZ`,
      [
        SHEET_SCHEMA[SHEET.offerings],
        offeringRow("gdynia-hiphop", "gdynia", "Hip-hop", "TAK", 10),
        offeringRow("sopot-hidden", "sopot", "Ukryte", "NIE", 10),
        offeringRow("inactive-city-class", "inactive-city", "Ukryte", "TAK", 10),
      ],
    ],
  ]);

  return {
    async getValues(range) {
      return values.get(range) ?? [];
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

describe("GoogleSheetsCatalogRepository", () => {
  it("publishes active offerings with computed intake status and active cities", async () => {
    const repository = new GoogleSheetsCatalogRepository(createClient());

    await expect(repository.getPublicCatalog("2026-08-19")).resolves.toEqual({
      cities: [{ id: "gdynia", name: "Gdynia", sortOrder: 10 }],
      offerings: [
        {
          id: "gdynia-hiphop",
          cityId: "gdynia",
          name: "Hip-hop",
          publicDescription: null,
          sortOrder: 10,
          intakeStatus: "OPEN",
        },
      ],
    });
  });
});
