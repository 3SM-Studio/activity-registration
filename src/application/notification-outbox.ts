import {
  buildRegistrationNotificationMessages,
  type RegistrationNotificationDependencies,
  type RegistrationNotificationResult,
} from "@/application/registration-notifications";
import {
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  notificationJobId,
  notificationTypeForIdempotencyKey,
  type NotificationOutboxJob,
  type NotificationType,
} from "@/domain/notification-outbox";
import type { NotificationOutboxRepository } from "@/domain/repositories";
import type { Registration } from "@/domain/registration";

const LEASE_DURATION_MS = 2 * 60_000;
const MAX_BACKOFF_MS = 24 * 60 * 60_000;
const PROVIDER_ERROR_CODE = "EMAIL_PROVIDER_ERROR";

export type DurableNotificationDependencies = RegistrationNotificationDependencies &
  Readonly<{
    outbox: NotificationOutboxRepository;
  }>;

function pendingJob(
  registration: Registration,
  type: NotificationType,
  now: string,
): NotificationOutboxJob {
  return {
    id: notificationJobId(registration.id, type),
    registrationId: registration.id,
    type,
    status: NOTIFICATION_STATUS.pending,
    attemptCount: 0,
    nextAttemptAt: now,
    lastAttemptAt: null,
    leaseToken: null,
    leaseUntil: null,
    errorCode: null,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
  };
}

export async function ensureRegistrationNotificationJobs(
  registration: Registration,
  outbox: NotificationOutboxRepository,
  now = new Date().toISOString(),
): Promise<void> {
  const existing = new Set((await outbox.listForRegistration(registration.id)).map((job) => job.id));

  for (const type of Object.values(NOTIFICATION_TYPE)) {
    const job = pendingJob(registration, type, now);
    if (!existing.has(job.id)) {
      await outbox.create(job);
    }
  }
}

function retryAt(failedAt: string, attemptCount: number): string {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 10));
  const delay = Math.min(MAX_BACKOFF_MS, 60_000 * 2 ** exponent);
  return new Date(Date.parse(failedAt) + delay).toISOString();
}

export async function dispatchRegistrationNotificationJobs(
  registration: Registration,
  dependencies: DurableNotificationDependencies,
  now: () => Date = () => new Date(),
): Promise<RegistrationNotificationResult> {
  await ensureRegistrationNotificationJobs(registration, dependencies.outbox, now().toISOString());
  const messages = await buildRegistrationNotificationMessages(registration, dependencies);
  const jobs = await dependencies.outbox.listForRegistration(registration.id);

  let attempted = 0;
  let failed = 0;

  for (const message of messages) {
    const type = notificationTypeForIdempotencyKey(message.idempotencyKey);
    if (!type) {
      continue;
    }

    const expectedId = notificationJobId(registration.id, type);
    const current = jobs.find((job) => job.id === expectedId);
    if (!current) {
      continue;
    }

    const claimedAt = now().toISOString();
    const leaseToken = crypto.randomUUID();
    const leaseUntil = new Date(Date.parse(claimedAt) + LEASE_DURATION_MS).toISOString();
    const claimed = await dependencies.outbox.claim(expectedId, claimedAt, leaseUntil, leaseToken);
    if (!claimed) {
      continue;
    }

    attempted += 1;
    try {
      await dependencies.sender.send(message);
      const sentAt = now().toISOString();
      await dependencies.outbox.markSent(expectedId, leaseToken, sentAt);
    } catch {
      failed += 1;
      const failedAt = now().toISOString();
      await dependencies.outbox.markFailed(
        expectedId,
        leaseToken,
        failedAt,
        PROVIDER_ERROR_CODE,
        retryAt(failedAt, claimed.attemptCount),
      );
    }
  }

  return { attempted, failed };
}

export async function reconcileRegistrationNotifications(
  registrations: readonly Registration[],
  dependencies: DurableNotificationDependencies,
  options: Readonly<{ forceFailed?: boolean; now?: () => Date }> = {},
): Promise<Readonly<{ registrations: number; attempted: number; failed: number; forced: number }>> {
  const now = options.now ?? (() => new Date());
  const nowIso = now().toISOString();
  const forced = options.forceFailed ? await dependencies.outbox.makeFailedJobsDue(nowIso) : 0;

  for (const registration of registrations) {
    await ensureRegistrationNotificationJobs(registration, dependencies.outbox, nowIso);
  }

  let attempted = 0;
  let failed = 0;
  for (const registration of registrations) {
    const result = await dispatchRegistrationNotificationJobs(registration, dependencies, now);
    attempted += result.attempted;
    failed += result.failed;
  }

  return { registrations: registrations.length, attempted, failed, forced };
}
