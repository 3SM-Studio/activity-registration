import { NOTIFICATION_STATUS, NOTIFICATION_TYPE, notificationJobId } from "../src/domain/notification-outbox";
import { LEGACY_REGISTRATION_STATUS } from "../src/domain/registration";
import { GoogleSheetsNotificationOutboxRepository } from "../src/infrastructure/google/notification-outbox.repository";
import { GoogleSheetsRegistrationRepository } from "../src/infrastructure/google/registration.repository";
import { validateSheetStructure } from "../src/infrastructure/google/sheet-admin";
import { cell, createHeaderMap } from "../src/infrastructure/google/header-map";
import { REGISTRATION_HEADERS, SHEET } from "../src/infrastructure/google/sheets-contracts";
import { getServerEnv } from "../src/lib/env";
import { createAdminSheetsClient } from "./_google-admin";

async function main() {
  const env = getServerEnv();

  if (env.DATA_BACKEND === "memory") {
    console.info(
      JSON.stringify(
        {
          ok: true,
          appEnv: env.APP_ENV,
          dataBackend: env.DATA_BACKEND,
          note: "Memory backend active. Google diagnostics skipped.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const client = createAdminSheetsClient();
  const report = await validateSheetStructure(client);
  const registrationRows = await client.getValues(`${SHEET.registrations}!A:ZZ`);
  const registrationHeaders = createHeaderMap(registrationRows[0] ?? [], REGISTRATION_HEADERS);
  const legacyWorkflowStatuses = registrationRows
    .slice(1)
    .map((row, offset) => ({
      rowNumber: offset + 2,
      status: cell(row, registrationHeaders, "STATUS"),
    }))
    .filter(
      ({ status }) =>
        status === LEGACY_REGISTRATION_STATUS.inProgress ||
        status === LEGACY_REGISTRATION_STATUS.accepted,
    );

  if (legacyWorkflowStatuses.length > 0) {
    throw new Error(
      `ZAPISY still contains ${legacyWorkflowStatuses.length} legacy workflow status value(s). Run sheet:migrate before treating diagnostics as green.`,
    );
  }

  const registrationRepository = new GoogleSheetsRegistrationRepository(client);
  const outboxRepository = new GoogleSheetsNotificationOutboxRepository(client);
  const [registrations, notificationJobs] = await Promise.all([
    registrationRepository.listAll(),
    outboxRepository.listAll(),
  ]);
  const notificationIds = new Set(notificationJobs.map((job) => job.id));
  const missingNotificationJobs = registrations.flatMap((registration) =>
    Object.values(NOTIFICATION_TYPE)
      .map((type) => notificationJobId(registration.id, type))
      .filter((id) => !notificationIds.has(id)),
  );
  const failedNotificationJobs = notificationJobs.filter(
    (job) => job.status === NOTIFICATION_STATUS.failed,
  );
  const nowMs = Date.now();
  const expiredNotificationLeases = notificationJobs.filter(
    (job) =>
      job.status === NOTIFICATION_STATUS.sending &&
      job.leaseUntil !== null &&
      Date.parse(job.leaseUntil) <= nowMs,
  );

  if (
    missingNotificationJobs.length > 0 ||
    failedNotificationJobs.length > 0 ||
    expiredNotificationLeases.length > 0
  ) {
    throw new Error(
      `Notification outbox unhealthy: ${missingNotificationJobs.length} missing job(s), ${failedNotificationJobs.length} failed job(s), ${expiredNotificationLeases.length} expired lease(s). Run notifications:reconcile or notifications:retry before treating diagnostics as green.`,
    );
  }

  console.info(
    JSON.stringify(
      {
        ok: true,
        appEnv: env.APP_ENV,
        dataBackend: env.DATA_BACKEND,
        spreadsheetConfigured: Boolean(env.GOOGLE_SPREADSHEET_ID),
        cityCount: report.cityCount,
        seasonCount: report.seasonCount,
        offeringCount: report.offeringCount,
        groupCount: report.groupCount,
        legacyWorkflowStatusCount: 0,
        notificationJobCount: notificationJobs.length,
        missingNotificationJobCount: 0,
        failedNotificationJobCount: 0,
        expiredNotificationLeaseCount: 0,
        warnings: report.warnings,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown diagnostics error.");
  process.exitCode = 1;
});
