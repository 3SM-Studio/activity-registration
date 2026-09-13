import { unstable_cache } from "next/cache";

import type { OfferingId, SeasonId } from "@/domain/catalog";
import type { CatalogRepository } from "@/domain/repositories";

const CATALOG_CACHE_SECONDS = 60;

export class CachedCatalogRepository implements CatalogRepository {
  private readonly getPublicCatalogCached: CatalogRepository["getPublicCatalog"];
  private readonly findSeasonByIdCached: CatalogRepository["findSeasonById"];
  private readonly findGroupsForOfferingCached: CatalogRepository["findGroupsForOffering"];

  constructor(inner: CatalogRepository, cacheScope: string) {
    this.getPublicCatalogCached = unstable_cache(
      async (currentDate: string, seasonId: SeasonId) =>
        inner.getPublicCatalog(currentDate, seasonId),
      ["pozytywka-public-catalog-v1", cacheScope],
      { revalidate: CATALOG_CACHE_SECONDS },
    );

    this.findSeasonByIdCached = unstable_cache(
      async (seasonId: SeasonId) => inner.findSeasonById(seasonId),
      ["pozytywka-season-v1", cacheScope],
      { revalidate: CATALOG_CACHE_SECONDS },
    );

    this.findGroupsForOfferingCached = unstable_cache(
      async (seasonId: SeasonId, offeringId: OfferingId) =>
        inner.findGroupsForOffering(seasonId, offeringId),
      ["pozytywka-offering-groups-v1", cacheScope],
      { revalidate: CATALOG_CACHE_SECONDS },
    );
  }

  getPublicCatalog(currentDate: string, seasonId: SeasonId) {
    return this.getPublicCatalogCached(currentDate, seasonId);
  }

  findSeasonById(seasonId: SeasonId) {
    return this.findSeasonByIdCached(seasonId);
  }

  findGroupsForOffering(seasonId: SeasonId, offeringId: OfferingId) {
    return this.findGroupsForOfferingCached(seasonId, offeringId);
  }
}
