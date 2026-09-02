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
const DAILY_QUOTA_RETRY_MS = 24 * 60 * 60_000 + 5 * 60_000;
const MONTHLY_QUOTA_RECHECK_MS = 24 * 60 * 60_000;
const PROVIDER_ERROR_CODE = "EMAIL_PROVIDER_ERROR";
const PROVIDER_UNAVAILABLE_ERROR_CODE = "EMAIL_PROVIDER_UNAVAILABLE";
const PROVIDER_INVALID_RESPONSE_ERROR_CODE = "EMAIL_PROVIDER_INVALID_RESPONSE";
const RESEND_DAILY_QUOTA_ERROR_CODE = "RESEND_DAILY_QUOTA_EXCEEDED";
const RESEND_MONTHLY_QUOTA_ERROR_CODE = "RESEND_MONTHLY_QUOTA_EXCEEDED";
const RESEND_RATE_LIMIT_ERROR_CODE = "RESEND_RATE_LIMIT_EXCEEDED";

export type DurableNotificationDependencies = RegistrationNotificationDependencies &
  Readonly<{
    outbox: NotificationOutboxRepository;
  }>;

type ProviderFailure = Readonly<{
  providerCode: string | null;
  retryAfterMs: number | null;
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
  const existing = new Set(
    (await outbox.listForRegistration(registration.id)).map((job) => job.id),
  );

  for (const type of Object.values(NOTIFICATION_TYPE)) {
    const job = pendingJob(registration, type, now);
    if (!existing.has(job.id)) {
      await outbox.create(job);
    }
  }
}

function exponentialBackoffMs(attemptCount: number): number {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 10));
  return Math.min(MAX_BACKOFF_MS, 60_000 * 2 ** exponent);
}

function providerFailure(error: unknown): ProviderFailure {
  if (typeof error !== "object" || error === null) {
    return { providerCode: null, retryAfterMs: null };
  }

  const candidate = error as Record<string, unknown>;
  const providerCode =
    typeof candidate.providerCode === "string" && candidate.providerCode.length > 0
      ? candidate.providerCode
      : null;
  const retryAfterMs =
    typeof candidate.retryAfterMs === "number" &&
    Number.isFinite(candidate.retryAfterMs) &&
    candidate.retryAfterMs >= 0
      ? candidate.retryAfterMs
      : null;

  return { providerCode, retryAfterMs };
}

function persistedErrorCode(failure: ProviderFailure): string {
  switch (failure.providerCode) {
    case "daily_quota_exceeded":
      return RESEND_DAILY_QUOTA_ERROR_CODE;
    case "monthly_quota_exceeded":
      return RESEND_MONTHLY_QUOTA_ERROR_CODE;
    case "rate_limit_exceeded":
      return RESEND_RATE_LIMIT_ERROR_CODE;
    case "request_failed":
      return PROVIDER_UNAVAILABLE_ERROR_CODE;
    case "invalid_response":
      return PROVIDER_INVALID_RESPONSE_ERROR_CODE;
    default:
      return PROVIDER_ERROR_CODE;
  }
}

function retryDelayMs(attemptCount: number, failure: ProviderFailure): number {
  switch (failure.providerCode) {
    case "daily_quota_exceeded":
      return Math.max(DAILY_QUOTA_RETRY_MS, failure.retryAfterMs ?? 0);
    case "monthly_quota_exceeded":
      return Math.max(MONTHLY_QUOTA_RECHECK_MS, failure.retryAfterMs ?? 0);
    case "rate_limit_exceeded":
      return Math.max(1_000, failure.retryAfterMs ?? exponentialBackoffMs(attemptCount));
    default:
      return failure.retryAfterMs ?? exponentialBackoffMs(attemptCount);
  }
}

function retryAt(failedAt: string, attemptCount: number, failure: ProviderFailure): string {
  return new Date(Date.parse(failedAt) + retryDelayMs(attemptCount, failure)).toISOString();
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
    } catch (error) {
      failed += 1;
      const failedAt = now().toISOString();
      const failure = providerFailure(error);
      await dependencies.outbox.markFailed(
        expectedId,
        leaseToken,
        failedAt,
        persistedErrorCode(failure),
        retryAt(failedAt, claimed.attemptCount, failure),
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
