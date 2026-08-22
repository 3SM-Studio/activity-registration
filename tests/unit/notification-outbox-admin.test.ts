import { describe, expect, it } from "vitest";

import { protectNotificationOutbox } from "@/infrastructure/google/notification-outbox-admin";
import { SHEET } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

function createClient(existingProtection = false) {
  const requests: Record<string, unknown>[] = [];
  const client: SheetsClient = {
    async getValues() {
      return [];
    },
    async updateValues() {},
    async appendValues() {},
    async appendTableRow() {},
    async clearValues() {},
    async getSheetMetadata() {
      return [
        {
          title: SHEET.notifications,
          sheetId: 77,
          protectedRanges: existingProtection
            ? [
                {
                  protectedRangeId: 123,
                  description: "activity-registration:hard-system:notification-outbox",
                  warningOnly: true,
                },
              ]
            : [],
        },
      ];
    },
    async batchUpdate(batch) {
      requests.push(...batch);
    },
  };
  return { client, requests };
}

describe("protectNotificationOutbox", () => {
  it("uses warning-only protection outside production", async () => {
    const { client, requests } = createClient(true);
    await protectNotificationOutbox(client);

    expect(requests).toEqual(
      expect.arrayContaining([
        { deleteProtectedRange: { protectedRangeId: 123 } },
        expect.objectContaining({
          addProtectedRange: {
            protectedRange: expect.objectContaining({
              description: "activity-registration:hard-system:notification-outbox",
              warningOnly: true,
              range: expect.objectContaining({ sheetId: 77 }),
            }),
          },
        }),
      ]),
    );
  });

  it("uses hard protection for the production service account", async () => {
    const { client, requests } = createClient();
    await protectNotificationOutbox(client, ["prod-sa@example.iam.gserviceaccount.com"]);

    expect(requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: expect.objectContaining({
            description: "activity-registration:hard-system:notification-outbox",
            warningOnly: false,
            editors: { users: ["prod-sa@example.iam.gserviceaccount.com"] },
          }),
        },
      },
    ]);
  });
});
