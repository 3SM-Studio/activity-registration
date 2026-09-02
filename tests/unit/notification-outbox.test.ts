import { describe, expect, it } from "vitest";

import {
  dispatchRegistrationNotificationJobs,
  ensureRegistrationNotificationJobs,
  reconcileRegistrationNotifications,
} from "@/application/notification-outbox";
import type { EmailMessage, EmailSender } from "@/application/registration-notifications";
import { asCityId, asOfferingId, asSeasonId } from "@/domain/catalog";
import {
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  type NotificationOutboxJob,
} from "@/domain/notification-outbox";
import type { NotificationOutboxRepository } from "@/domain/repositories";
import {
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  asRegistrationId,
  asRequestId,
  type Registration,
  type RegistrationId,
} from "@/domain/registration";

function registration(): Registration {
  return {
    id: asRegistrationId("reg_11111111-1111-4111-8111-111111111111"),
    requestId: asRequestId("22222222-2222-4222-8222-222222222222"),
    submittedAt: "2026-08-22T12:00:00.000Z",
    seasonId: asSeasonId("test-2026-2027"),
    seasonNameSnapshot: "2026/2027",
    offeringId: asOfferingId("gdynia-musical"),
    cityIdSnapshot: asCityId("gdynia"),
    cityNameSnapshot: "Gdynia",
    offeringNameSnapshot: "Teatr muzyczny",
    participantFirstName: "Jan",
    participantLastName: "Kowalski",
    birthDate: "2012-01-15",
    ageAtSubmission: 14,
    guardianFirstName: "Anna",
    guardianLastName: "Kowalska",
    phone: "+48500000000",
    email: "anna@example.com",
    status: REGISTRATION_STATUS.new,
    assignedGroupId: null,
    contactedAt: null,
    confirmedAt: null,
    closedAt: null,
    possibleDuplicateOf: null,
    notes: "",
    privacyNoticeVersion: "v1",
    source: REGISTRATION_SOURCE.web,
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
  };
}

class FakeOutbox implements NotificationOutboxRepository {
  readonly jobs: NotificationOutboxJob[] = [];

  async listAll() {
    return [...this.jobs];
  }

  async listForRegistration(registrationId: RegistrationId) {
    return this.jobs.filter((job) => job.registrationId === registrationId);
  }

  async create(job: NotificationOutboxJob) {
    if (!this.jobs.some((candidate) => candidate.id === job.id)) {
      this.jobs.push(job);
    }
  }

  async claim(notificationId: string, now: string, leaseUntil: string, leaseToken: string) {
    const index = this.jobs.findIndex((job) => job.id === notificationId);
    const current = this.jobs[index];
    if (!current) return null;

    const nowMs = Date.parse(now);
    if (
      current.status === NOTIFICATION_STATUS.sent ||
      current.status === NOTIFICATION_STATUS.skipped ||
      (current.status === NOTIFICATION_STATUS.sending &&
        current.leaseUntil !== null &&
        Date.parse(current.leaseUntil) > nowMs) ||
      (current.nextAttemptAt !== null && Date.parse(current.nextAttemptAt) > nowMs)
    ) {
      return null;
    }

    const claimed: NotificationOutboxJob = {
      ...current,
      status: NOTIFICATION_STATUS.sending,
      attemptCount: current.attemptCount + 1,
      nextAttemptAt: null,
      lastAttemptAt: now,
      leaseToken,
      leaseUntil,
      errorCode: null,
      updatedAt: now,
    };
    this.jobs[index] = claimed;
    return claimed;
  }

  async markSent(notificationId: string, leaseToken: string, sentAt: string) {
    const index = this.jobs.findIndex((job) => job.id === notificationId);
    const current = this.jobs[index];
    if (!current || current.leaseToken !== leaseToken) return;
    this.jobs[index] = {
      ...current,
      status: NOTIFICATION_STATUS.sent,
      nextAttemptAt: null,
      leaseToken: null,
      leaseUntil: null,
      errorCode: null,
      updatedAt: sentAt,
      sentAt,
    };
  }

  async markFailed(
    notificationId: string,
    leaseToken: string,
    failedAt: string,
    errorCode: string,
    nextAttemptAt: string,
  ) {
    const index = this.jobs.findIndex((job) => job.id === notificationId);
    const current = this.jobs[index];
    if (!current || current.leaseToken !== leaseToken) return;
    this.jobs[index] = {
      ...current,
      status: NOTIFICATION_STATUS.failed,
      nextAttemptAt,
      leaseToken: null,
      leaseUntil: null,
      errorCode,
      updatedAt: failedAt,
    };
  }

  async makeFailedJobsDue(now: string) {
    let count = 0;
    for (const [index, job] of this.jobs.entries()) {
      if (job.status !== NOTIFICATION_STATUS.failed) continue;
      this.jobs[index] = { ...job, nextAttemptAt: now, updatedAt: now };
      count += 1;
    }
    return count;
  }
}

class RecordingSender implements EmailSender {
  readonly messages: EmailMessage[] = [];

  constructor(private readonly shouldFail = false) {}

  async send(message: EmailMessage) {
    this.messages.push(message);
    if (this.shouldFail) {
      throw new Error("synthetic provider failure");
    }
    return { id: `mail-${this.messages.length}` };
  }
}

function clock(...timestamps: string[]): () => Date {
  let index = 0;
  return () => new Date(timestamps[Math.min(index++, timestamps.length - 1)]!);
}

const baseNotificationConfig = {
  from: "Pozytywka <zapisy@example.com>",
  adminEmails: ["biuro@example.com"],
} as const;

describe("durable notification outbox", () => {
  it("creates exactly one stable pending confirmation job while admin email is disabled", async () => {
    const outbox = new FakeOutbox();
    await ensureRegistrationNotificationJobs(registration(), outbox, "2026-08-22T12:00:00.000Z");
    await ensureRegistrationNotificationJobs(registration(), outbox, "2026-08-22T12:01:00.000Z");

    expect(outbox.jobs).toHaveLength(1);
    expect(outbox.jobs[0]?.type).toBe(NOTIFICATION_TYPE.confirmation);
    expect(outbox.jobs[0]?.status).toBe(NOTIFICATION_STATUS.pending);
    expect(outbox.jobs.some((job) => job.type === NOTIFICATION_TYPE.admin)).toBe(false);
  });

  it("persists a participant-email failure and retries it after backoff", async () => {
    const outbox = new FakeOutbox();
    const failingSender = new RecordingSender(true);
    const first = await dispatchRegistrationNotificationJobs(
      registration(),
      { ...baseNotificationConfig, sender: failingSender, outbox },
      clock(
        "2026-08-22T12:00:00.000Z",
        "2026-08-22T12:00:00.000Z",
        "2026-08-22T12:00:01.000Z",
        "2026-08-22T12:00:02.000Z",
      ),
    );

    expect(first).toEqual({ attempted: 1, failed: 1 });
    const failed = outbox.jobs.find((job) => job.type === NOTIFICATION_TYPE.confirmation);
    expect(failed).toMatchObject({
      status: NOTIFICATION_STATUS.failed,
      attemptCount: 1,
      errorCode: "EMAIL_PROVIDER_ERROR",
    });
    expect(failed?.nextAttemptAt).toBe("2026-08-22T12:01:01.000Z");

    const successfulSender = new RecordingSender(false);
    const retry = await dispatchRegistrationNotificationJobs(
      registration(),
      { ...baseNotificationConfig, sender: successfulSender, outbox },
      clock("2026-08-22T12:02:00.000Z", "2026-08-22T12:02:00.000Z", "2026-08-22T12:02:01.000Z"),
    );

    expect(retry).toEqual({ attempted: 1, failed: 0 });
    expect(successfulSender.messages).toHaveLength(1);
    expect(successfulSender.messages[0]?.idempotencyKey).toMatch(/^registration-confirmation\//);
    expect(outbox.jobs[0]?.status).toBe(NOTIFICATION_STATUS.sent);
  });

  it("reconcile repairs the confirmation job and is idempotent after delivery", async () => {
    const outbox = new FakeOutbox();
    const sender = new RecordingSender();
    const first = await reconcileRegistrationNotifications(
      [registration()],
      { ...baseNotificationConfig, sender, outbox },
      { now: () => new Date("2026-08-22T13:00:00.000Z") },
    );

    expect(first).toMatchObject({ registrations: 1, attempted: 1, failed: 0 });
    expect(sender.messages).toHaveLength(1);

    const second = await reconcileRegistrationNotifications(
      [registration()],
      { ...baseNotificationConfig, sender, outbox },
      { now: () => new Date("2026-08-22T13:05:00.000Z") },
    );

    expect(second).toMatchObject({ registrations: 1, attempted: 0, failed: 0 });
    expect(sender.messages).toHaveLength(1);
  });
});
