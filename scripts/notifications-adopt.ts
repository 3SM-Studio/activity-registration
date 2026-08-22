import {
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  notificationJobId,
  type NotificationOutboxJob,
} from "../src/domain/notification-outbox";
import type { Registration } from "../src/domain/registration";
import { createApplicationRepositories } from "../src/infrastructure/repositories";

function skippedJob(
  registration: Registration,
  type: (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE],
  now: string,
): NotificationOutboxJob {
  return {
    id: notificationJobId(registration.id, type),
    registrationId: registration.id,
    type,
    status: NOTIFICATION_STATUS.skipped,
    attemptCount: 0,
    nextAttemptAt: null,
    lastAttemptAt: null,
    leaseToken: null,
    leaseUntil: null,
    errorCode: "PRE_OUTBOX_REGISTRATION",
    createdAt: now,
    updatedAt: now,
    sentAt: null,
  };
}

async function main() {
  const repositories = createApplicationRepositories();
  const outbox = repositories.notifications;
  const listRegistrations = repositories.registrations.listAll;

  if (!outbox || !listRegistrations) {
    throw new Error("Durable notification repositories are not available for this backend.");
  }

  const settings = await repositories.settings.getPublicSettings();
  if (settings.registrationsOpen) {
    throw new Error("Refusing notification outbox adoption while registrations are open.");
  }

  const existingJobs = await outbox.listAll();
  if (existingJobs.length > 0) {
    throw new Error(
      `Notification outbox already contains ${existingJobs.length} job(s). Refusing adoption to avoid reclassifying live jobs.`,
    );
  }

  const registrations = await listRegistrations.call(repositories.registrations);
  const now = new Date().toISOString();
  let created = 0;

  for (const registration of registrations) {
    for (const type of Object.values(NOTIFICATION_TYPE)) {
      await outbox.create(skippedJob(registration, type, now));
      created += 1;
    }
  }

  console.info(
    JSON.stringify(
      {
        ok: true,
        existingRegistrations: registrations.length,
        skippedLegacyJobsCreated: created,
        reason: "PRE_OUTBOX_REGISTRATION",
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown notification adoption error.");
  process.exitCode = 1;
});
