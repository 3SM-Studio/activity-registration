import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import type { PublicCatalog } from "@/domain/catalog";
import type { ApplicationRepositories } from "@/domain/repositories";
import { dateOnlyInPoland } from "@/lib/birth-date";

export type GetPublicFormConfigOptions = Readonly<{
  requirePrivacyConfiguration?: boolean;
  now?: () => Date;
}>;

const EMPTY_CATALOG: PublicCatalog = { cities: [], offerings: [] };

export async function getPublicFormConfig(
  repositories: ApplicationRepositories,
  options: GetPublicFormConfigOptions = {},
) {
  const nowDate = (options.now ?? (() => new Date()))();
  const currentDate = dateOnlyInPoland(nowDate);
  const settings = await repositories.settings.getPublicSettings();

  if (
    options.requirePrivacyConfiguration &&
    (!settings.privacyNoticeUrl || !settings.privacyNoticeVersion)
  ) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.systemNotReady,
      "System zapisów nie jest jeszcze gotowy do pracy produkcyjnej.",
    );
  }

  if (!settings.currentSeasonId) {
    if (settings.registrationsOpen) {
      throw new ApplicationError(
        APPLICATION_ERROR_CODE.systemNotReady,
        "System zapisów nie ma skonfigurowanego bieżącego sezonu.",
      );
    }

    return { catalog: EMPTY_CATALOG, settings, ageReferenceDate: null } as const;
  }

  const season = await repositories.catalog.findSeasonById(settings.currentSeasonId);
  if (!season || !season.active) {
    if (settings.registrationsOpen) {
      throw new ApplicationError(
        APPLICATION_ERROR_CODE.systemNotReady,
        "Skonfigurowany sezon zapisów nie jest dostępny.",
      );
    }

    return { catalog: EMPTY_CATALOG, settings, ageReferenceDate: null } as const;
  }

  const catalog = await repositories.catalog.getPublicCatalog(currentDate, season.id);

  return {
    catalog,
    settings,
    ageReferenceDate: season.startDate,
  } as const;
}
