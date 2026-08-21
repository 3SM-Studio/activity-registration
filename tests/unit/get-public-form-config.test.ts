import { describe, expect, it } from "vitest";

import { APPLICATION_ERROR_CODE } from "@/application/errors";
import { getPublicFormConfig } from "@/application/get-public-form-config";
import { asSeasonId } from "@/domain/catalog";
import type { ApplicationRepositories } from "@/domain/repositories";

const currentSeasonId = asSeasonId("test-2026-2027");

function createRepositories(
  privacyNoticeUrl: string | null,
  privacyNoticeVersion: string | null,
): ApplicationRepositories {
  return {
    catalog: {
      async getPublicCatalog() {
        return { cities: [], offerings: [] };
      },
      async findSeasonById(seasonId) {
        return seasonId === currentSeasonId
          ? {
              id: currentSeasonId,
              name: "2026/2027",
              startDate: "2026-09-01",
              endDate: "2027-07-31",
              active: true,
              sortOrder: 10,
            }
          : null;
      },
      async findGroupsForOffering() {
        return [];
      },
    },
    settings: {
      async getPublicSettings() {
        return {
          registrationsOpen: true,
          currentSeasonId,
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
      async findPotentialDuplicates() {
        return [];
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
      settings: { registrationsOpen: true, currentSeasonId },
    });
  });
});
