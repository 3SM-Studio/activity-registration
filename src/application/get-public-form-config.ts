import { APPLICATION_ERROR_CODE, ApplicationError } from "@/application/errors";
import type { ApplicationRepositories } from "@/domain/repositories";
import { dateOnlyInPoland } from "@/lib/birth-date";

export type GetPublicFormConfigOptions = Readonly<{
  requirePrivacyConfiguration?: boolean;
  now?: () => Date;
}>;

export async function getPublicFormConfig(
  repositories: ApplicationRepositories,
  options: GetPublicFormConfigOptions = {},
) {
  const nowDate = (options.now ?? (() => new Date()))();
  const currentDate = dateOnlyInPoland(nowDate);
  const [catalog, settings] = await Promise.all([
    repositories.catalog.getPublicCatalog(currentDate),
    repositories.settings.getPublicSettings(),
  ]);

  if (
    options.requirePrivacyConfiguration &&
    (!settings.privacyNoticeUrl || !settings.privacyNoticeVersion)
  ) {
    throw new ApplicationError(
      APPLICATION_ERROR_CODE.systemNotReady,
      "System zapisów nie jest jeszcze gotowy do pracy produkcyjnej.",
    );
  }

  return {
    catalog,
    settings,
  } as const;
}
