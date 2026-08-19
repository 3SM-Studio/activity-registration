import type { PublicCatalog, Season, SeasonId } from "@/domain/catalog";
import type { CatalogRepository } from "@/domain/repositories";
import { createHeaderMap } from "@/infrastructure/google/header-map";
import {
  assertUniqueIds,
  parseCityRow,
  parseOfferingRow,
  parseSeasonRow,
} from "@/infrastructure/google/parsers";
import {
  CITY_HEADERS,
  OFFERING_HEADERS,
  SEASON_HEADERS,
  SHEET,
} from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

export class GoogleSheetsCatalogRepository implements CatalogRepository {
  constructor(private readonly client: SheetsClient) {}

  private async readCatalog() {
    const [cityRows, offeringRows] = await Promise.all([
      this.client.getValues(`${SHEET.cities}!A:ZZ`),
      this.client.getValues(`${SHEET.offerings}!A:ZZ`),
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
    const rows = await this.client.getValues(`${SHEET.seasons}!A:ZZ`);
    const headers = createHeaderMap(rows[0] ?? [], SEASON_HEADERS);
    const seasons = rows
      .slice(1)
      .map((row) => parseSeasonRow(row, headers))
      .filter((season) => season !== null);

    assertUniqueIds(seasons, "season");
    return seasons;
  }

  async getPublicCatalog(): Promise<PublicCatalog> {
    const { cities, offerings } = await this.readCatalog();

    const activeCities = cities.filter((city) => city.active);
    const activeCityIds = new Set(activeCities.map((city) => city.id));

    const publicOfferings = offerings
      .filter((offering) => offering.active && activeCityIds.has(offering.cityId))
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
      offerings: publicOfferings.map(({ id, cityId, name, sortOrder }) => ({
        id,
        cityId,
        name,
        sortOrder,
      })),
    };
  }

  async findSeasonById(seasonId: SeasonId): Promise<Season | null> {
    const seasons = await this.readSeasons();
    return seasons.find((season) => season.id === seasonId) ?? null;
  }
}
