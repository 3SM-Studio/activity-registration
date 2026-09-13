import { unstable_cache } from "next/cache";

import { getPublicFormConfig } from "@/application/get-public-form-config";
import { createApplicationRepositories } from "@/infrastructure/repositories";
import { getServerEnv } from "@/lib/env";

const PUBLIC_FORM_CACHE_SECONDS = 60;

const getCachedProductionPublicFormConfig = unstable_cache(
  async (cacheScope: string) => {
    void cacheScope;
    const env = getServerEnv();

    return getPublicFormConfig(createApplicationRepositories(), {
      requirePrivacyConfiguration: true,
    });
  },
  ["pozytywka-public-form-config-v1"],
  { revalidate: PUBLIC_FORM_CACHE_SECONDS },
);

export async function getPublicFormConfigForRequest() {
  const env = getServerEnv();

  if (env.APP_ENV !== "production") {
    return getPublicFormConfig(createApplicationRepositories(), {
      requirePrivacyConfiguration: false,
    });
  }

  const cacheScope = `${env.APP_ENV}:${env.DATA_BACKEND}:${env.GOOGLE_SPREADSHEET_ID ?? "none"}`;
  return getCachedProductionPublicFormConfig(cacheScope);
}
