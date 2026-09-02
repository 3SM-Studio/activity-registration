import { describe, expect, it } from "vitest";

import { dispatchRegistrationNotificationJobs } from "@/application/notification-outbox";
import type { EmailSender } from "@/application/registration-notifications";
import { asCityId, asOfferingId, asSeasonId } from "@/domain/catalog";
import { NOTIFICATION_STATUS, type NotificationOutboxJob } from "@/domain/notification-outbox";
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

class MemoryOutbox implements NotificationOutboxRepository {
  readonly jobs: NotificationOutboxJob[] = [];

  async listAll() {
    return [...this.jobs];
  }

  async listForRegistration(registrationId: RegistrationId) {
    return this.jobs.filter((job) => job.registrationId === registrationId);
  }

  async create(job: NotificationOutboxJob) {
    if (!this.jobs.some((candidate) => candidate.id === job.id)) this.jobs.push(job);
  }

  async claim(notificationId: string, now: string, leaseUntil: string, leaseToken: string) {
    const index = this.jobs.findIndex((job) => job.id === notificationId);
    const current = this.jobs[index];
    if (!current || current.status === NOTIFICATION_STATUS.sent) return null;
    if (current.nextAttemptAt && Date.parse(current.nextAttemptAt) > Date.parse(now)) return null;

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

  async makeFailedJobsDue() {
    return 0;
  }
}

const quotaSender: EmailSender = {
  async send() {
    throw Object.assign(new Error("quota"), {
      providerCode: "daily_quota_exceeded",
      retryAfterMs: null,
    });
  },
};

function registration(): Registration {
  return {
    id: asRegistrationId("reg_11111111-1111-4111-8111-111111111111"),
    requestId: asRequestId("22222222-2222-4222-8222-222222222222"),
    submittedAt: "2026-09-02T10:00:00.000Z",
    seasonId: asSeasonId("2026-2027"),
    seasonNameSnapshot: "2026/2027",
    offeringId: asOfferingId("olkusz-psikusy"),
    cityIdSnapshot: asCityId("olkusz"),
    cityNameSnapshot: "Olkusz",
    offeringNameSnapshot: "Psikusy",
    participantFirstName: "Test",
    participantLastName: "Uczestnik",
    birthDate: "2020-01-01",
    ageAtSubmission: 6,
    guardianFirstName: "Test",
    guardianLastName: "Opiekun",
    phone: "+48500000000",
    email: "test@example.com",
    status: REGISTRATION_STATUS.new,
    assignedGroupId: null,
    contactedAt: null,
    confirmedAt: null,
    closedAt: null,
    possibleDuplicateOf: null,
    notes: "",
    privacyNoticeVersion: "2026-08-20",
    source: REGISTRATION_SOURCE.web,
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
  };
}

describe("quota-aware notification retry", () => {
  it("keeps daily-quota failures durable and delays retry for more than 24 hours", async () => {
    const outbox = new MemoryOutbox();
    const now = () => new Date("2026-09-02T10:00:00.000Z");

    await expect(
      dispatchRegistrationNotificationJobs(
        registration(),
        {
          sender: quotaSender,
          from: "Pozytywka <zapisy@example.com>",
          adminEmails: ["biuro@example.com"],
          outbox,
        },
        now,
      ),
    ).resolves.toEqual({ attempted: 2, failed: 2 });

    expect(outbox.jobs).toHaveLength(2);
    for (const job of outbox.jobs) {
      expect(job.status).toBe(NOTIFICATION_STATUS.failed);
      expect(job.errorCode).toBe("RESEND_DAILY_QUOTA_EXCEEDED");
      expect(job.nextAttemptAt).toBe("2026-09-03T10:05:00.000Z");
    }
  });
});
