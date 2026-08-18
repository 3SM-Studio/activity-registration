import { describe, expect, it } from "vitest";

import { getPublicFormConfig } from "@/application/get-public-form-config";
import { APPLICATION_ERROR_CODE } from "@/application/errors";
import type { ApplicationRepositories } from "@/domain/repositories";

function createRepositories(
  privacyNoticeUrl: string | null,
  privacyNoticeVersion: string | null,
): ApplicationRepositories {
  return {
    catalog: {
      async getPublicCatalog() {
        return { cities: [], offerings: [] };
      },
    },
    settings: {
      async getPublicSettings() {
        return {
          registrationsOpen: true,
          formTitle: "Zapisy",
          successMessage: "Dziękujemy",
          privacyNoticeUrl,
          privacyNoticeVersion,
        };
      },
    },
    registrations: {
      async findByRequestId() {
        return null;
      },
      async create() {},
    },
  };
}

describe("getPublicFormConfig", () => {
  it("fails closed in production-like mode without privacy configuration", async () => {
    await expect(
      getPublicFormConfig(createRepositories(null, null), {
        requirePrivacyConfiguration: true,
      }),
    ).rejects.toMatchObject({
      code: APPLICATION_ERROR_CODE.systemNotReady,
    });
  });

  it("allows TEST configuration without a production privacy notice", async () => {
    await expect(getPublicFormConfig(createRepositories(null, null))).resolves.toMatchObject({
      settings: { registrationsOpen: true },
    });
  });
});
