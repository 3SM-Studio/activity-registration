import { describe, expect, it } from "vitest";

import { asOfferingId, asSeasonId } from "@/domain/catalog";
import { GoogleSheetsCatalogRepository } from "@/infrastructure/google/catalog.repository";
import { SHEET, SHEET_SCHEMA } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient, ValueRenderOption } from "@/infrastructure/google/sheets-client";

function offeringRow(
  id: string,
  cityId: string,
  name: string,
  active: string,
  sortOrder: number,
): readonly unknown[] {
  return [id, cityId, name, "", active, sortOrder, "ROLLING", "OPEN", "", "", "FALSE"];
}

type GetValuesCall = Readonly<{
  range: string;
  valueRenderOption?: ValueRenderOption;
}>;

function createClient(onGetValues?: (call: GetValuesCall) => void): SheetsClient {
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
    [
      `${SHEET.seasons}!A:ZZ`,
      [SHEET_SCHEMA[SHEET.seasons], ["test-2026-2027", "2026/2027 TEST", 46266, 46599, "TAK", 10]],
    ],
    [
      `${SHEET.groups}!A:ZZ`,
      [
        SHEET_SCHEMA[SHEET.groups],
        [
          "gdynia-hiphop-mlodsi",
          "test-2026-2027",
          "gdynia-hiphop",
          "Młodsi",
          8,
          12,
          "Wtorek",
          "16:00",
          "17:00",
          "Sala",
          "Instruktor",
          15,
          "TAK",
          10,
        ],
        [
          "gdynia-hiphop-starsi",
          "test-2026-2027",
          "gdynia-hiphop",
          "Starsi",
          13,
          18,
          "Środa",
          "17:00",
          "18:00",
          "Sala",
          "Instruktor",
          15,
          "TAK",
          20,
        ],
      ],
    ],
  ]);

  return {
    async getValues(range, options) {
      onGetValues?.({
        range,
        ...(options?.valueRenderOption ? { valueRenderOption: options.valueRenderOption } : {}),
      });
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
  it("publishes active offerings only when the current season has active groups", async () => {
    const repository = new GoogleSheetsCatalogRepository(createClient());

    await expect(
      repository.getPublicCatalog("2026-08-19", asSeasonId("test-2026-2027")),
    ).resolves.toEqual({
      cities: [{ id: "gdynia", name: "Gdynia", sortOrder: 10 }],
      offerings: [
        {
          id: "gdynia-hiphop",
          cityId: "gdynia",
          name: "Hip-hop",
          publicDescription: null,
          sortOrder: 10,
          intakeStatus: "OPEN",
          ageRanges: [
            { min: 8, max: 12 },
            { min: 13, max: 18 },
          ],
        },
      ],
    });
  });

  it("returns active groups for the selected season and offering", async () => {
    const repository = new GoogleSheetsCatalogRepository(createClient());

    await expect(
      repository.findGroupsForOffering(asSeasonId("test-2026-2027"), asOfferingId("gdynia-hiphop")),
    ).resolves.toHaveLength(2);
  });

  it("reads date-bearing sheet values without locale formatting", async () => {
    const calls: GetValuesCall[] = [];
    const repository = new GoogleSheetsCatalogRepository(createClient((call) => calls.push(call)));

    await repository.getPublicCatalog("2026-08-19", asSeasonId("test-2026-2027"));
    await expect(repository.findSeasonById(asSeasonId("test-2026-2027"))).resolves.toMatchObject({
      startDate: "2026-09-01",
      endDate: "2027-07-31",
    });

    expect(calls).toContainEqual({
      range: `${SHEET.groups}!A:ZZ`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    expect(calls).toContainEqual({
      range: `${SHEET.seasons}!A:ZZ`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
  });
});
