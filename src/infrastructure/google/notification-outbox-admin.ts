import { NOTIFICATION_HEADERS, SHEET } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

const OUTBOX_PROTECTION_DESCRIPTION = "activity-registration:hard-system:notification-outbox";

export async function protectNotificationOutbox(
  client: SheetsClient,
  hardProtectionEditorEmails: readonly string[] = [],
): Promise<void> {
  const metadata = await client.getSheetMetadata();
  const sheet = metadata.find((candidate) => candidate.title === SHEET.notifications);
  if (!sheet) {
    throw new Error(`${SHEET.notifications} sheet is missing.`);
  }

  const requests: Record<string, unknown>[] = [];
  for (const protectedRange of sheet.protectedRanges ?? []) {
    if (protectedRange.description === OUTBOX_PROTECTION_DESCRIPTION) {
      requests.push({ deleteProtectedRange: { protectedRangeId: protectedRange.protectedRangeId } });
    }
  }

  const editorEmails = [...hardProtectionEditorEmails];
  const hard = editorEmails.length > 0;
  requests.push({
    addProtectedRange: {
      protectedRange: {
        description: OUTBOX_PROTECTION_DESCRIPTION,
        warningOnly: !hard,
        ...(hard ? { editors: { users: editorEmails } } : {}),
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: 0,
          startColumnIndex: 0,
          endColumnIndex: NOTIFICATION_HEADERS.length,
        },
      },
    },
  });

  await client.batchUpdate(requests);
}
