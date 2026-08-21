import type {
  InternalGroup,
  OfferingId,
  PublicAgeRange,
  PublicCatalog,
  Season,
  SeasonId,
} from "@/domain/catalog";
import { computeOfferingIntakeStatus } from "@/domain/offering-intake";
import type { CatalogRepository } from "@/domain/repositories";
import { createHeaderMap } from "@/infrastructure/google/header-map";
import {
  assertUniqueIds,
  parseCityRow,
  parseGroupRow,
  parseOfferingRow,
  parseSeasonRow,
} from "@/infrastructure/google/parsers";
import {
  CITY_HEADERS,
  GROUP_HEADERS,
  OFFERING_HEADERS,
  SEASON_HEADERS,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

const UNFORMATTED_VALUES = { valueRenderOption: "UNFORMATTED_VALUE" } as const;

function publicAgeRanges(groups: readonly InternalGroup[]): readonly PublicAgeRange[] {
  const seen = new Set<string>();
  return groups
    .map((group) => ({ min: group.ageMin, max: group.ageMax }))
    .filter((range) => {
      const key = `${range.min ?? "*"}:${range.max ?? "*"}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => (left.min ?? -1) - (right.min ?? -1) || (left.max ?? 999) - (right.max ?? 999));
}

export class GoogleSheetsCatalogRepository implements CatalogRepository {
  constructor(private readonly client: SheetsClient) {}

  private async readCatalog() {
    const [cityRows, offeringRows] = await Promise.all([
      this.client.getValues(`${SHEET.cities}!A:ZZ`, UNFORMATTED_VALUES),
      this.client.getValues(`${SHEET.offerings}!A:ZZ`, UNFORMATTED_VALUES),
    ]);

    const cityHeader = cityRows[0] ?? [];
    const offeringHeader = offeringRows[0] ?? [];
    const cityHeaders = createHeaderMap(cityHeader, CITY_HEADERS);
    const offeringHeaders = createHeaderMap(offeringHeader, OFFERING_HEADERS);

    const cities = cityRows
      .slice(1)
      .map((row) => parseCityRow(row, cityHeaders))
      .filter((city) => city !== null);

    const offerings = offeringRows
      .slice(1)
      .map((row) => parseOfferingRow(row, offeringHeaders))
      .filter((offering) => offering !== null);

    assertUniqueIds(cities, "city");
    assertUniqueIds(offerings, "offering");

    return { cities, offerings };
  }

  private async readSeasons(): Promise<readonly Season[]> {
    const rows = await this.client.getValues(`${SHEET.seasons}!A:ZZ`, UNFORMATTED_VALUES);
    const headers = createHeaderMap(rows[0] ?? [], SEASON_HEADERS);
    const seasons = rows
      .slice(1)
      .map((row) => parseSeasonRow(row, headers))
      .filter((season) => season !== null);

    assertUniqueIds(seasons, "season");
    return seasons;
  }

  private async readGroups(): Promise<readonly InternalGroup[]> {
    const rows = await this.client.getValues(`${SHEET.groups}!A:ZZ`, UNFORMATTED_VALUES);
    const headers = createHeaderMap(rows[0] ?? [], GROUP_HEADERS);
    const groups = rows
      .slice(1)
      .map((row) => parseGroupRow(row, headers))
      .filter((group) => group !== null);

    assertUniqueIds(groups, "group");
    return groups;
  }

  async getPublicCatalog(currentDate: string, seasonId: SeasonId): Promise<PublicCatalog> {
    const [{ cities, offerings }, groups] = await Promise.all([this.readCatalog(), this.readGroups()]);

    const activeCities = cities.filter((city) => city.active);
    const activeCityIds = new Set(activeCities.map((city) => city.id));
    const activeSeasonGroups = groups.filter((group) => group.active && group.seasonId === seasonId);

    const publicOfferings = offerings
      .filter((offering) => offering.active && activeCityIds.has(offering.cityId))
      .flatMap((offering) => {
        const offeringGroups = activeSeasonGroups.filter((group) => group.offeringId === offering.id);
        if (offeringGroups.length === 0) {
          return [];
        }

        return [
          {
            id: offering.id,
            cityId: offering.cityId,
            name: offering.name,
            publicDescription: offering.publicDescription,
            sortOrder: offering.sortOrder,
            intakeStatus: computeOfferingIntakeStatus(offering, currentDate),
            ageRanges: publicAgeRanges(offeringGroups),
          },
        ];
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"));

    const cityIdsWithOfferings = new Set(publicOfferings.map((offering) => offering.cityId));
    const publicCities = activeCities
      .filter((city) => cityIdsWithOfferings.has(city.id))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"));

    return {
      cities: publicCities.map(({ id, name, sortOrder }) => ({
        id,
        name,
        sortOrder,
      })),
      offerings: publicOfferings,
    };
  }

  async findSeasonById(seasonId: SeasonId): Promise<Season | null> {
    const seasons = await this.readSeasons();
    return seasons.find((season) => season.id === seasonId) ?? null;
  }

  async findGroupsForOffering(
    seasonId: SeasonId,
    offeringId: OfferingId,
  ): Promise<readonly InternalGroup[]> {
    const groups = await this.readGroups();
    return groups
      .filter(
        (group) => group.active && group.seasonId === seasonId && group.offeringId === offeringId,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"));
  }
}
