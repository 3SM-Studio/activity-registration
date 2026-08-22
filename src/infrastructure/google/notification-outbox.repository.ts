import {
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  notificationJobId,
  type NotificationOutboxJob,
  type NotificationStatus,
  type NotificationType,
} from "@/domain/notification-outbox";
import type { NotificationOutboxRepository } from "@/domain/repositories";
import { asRegistrationId, isRegistrationId, type RegistrationId } from "@/domain/registration";
import {
  SheetSchemaError,
  buildRowByHeaders,
  cell,
  createHeaderMap,
} from "@/infrastructure/google/header-map";
import { NOTIFICATION_HEADERS, SHEET } from "@/infrastructure/google/sheets-contracts";
import type { SheetsClient } from "@/infrastructure/google/sheets-client";

const notificationTypes = new Set<string>(Object.values(NOTIFICATION_TYPE));
const notificationStatuses = new Set<string>(Object.values(NOTIFICATION_STATUS));

function parseOptionalTimestamp(value: string, label: string, notificationId: string): string | null {
  if (!value) {
    return null;
  }
  if (Number.isNaN(Date.parse(value))) {
    throw new SheetSchemaError(`Invalid ${label} for notification ${notificationId}.`);
  }
  return value;
}

function notificationToCells(job: NotificationOutboxJob): Readonly<Record<string, string | number>> {
  return {
    NOTIFICATION_ID: job.id,
    REGISTRATION_ID: job.registrationId,
    TYPE: job.type,
    STATUS: job.status,
    ATTEMPT_COUNT: job.attemptCount,
    NEXT_ATTEMPT_AT: job.nextAttemptAt ?? "",
    LAST_ATTEMPT_AT: job.lastAttemptAt ?? "",
    LEASE_TOKEN: job.leaseToken ?? "",
    LEASE_UNTIL: job.leaseUntil ?? "",
    ERROR_CODE: job.errorCode ?? "",
    CREATED_AT: job.createdAt,
    UPDATED_AT: job.updatedAt,
    SENT_AT: job.sentAt ?? "",
  };
}

function columnLetter(columnIndex: number): string {
  let value = columnIndex + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function canClaim(job: NotificationOutboxJob, now: string): boolean {
  if (job.status === NOTIFICATION_STATUS.sent || job.status === NOTIFICATION_STATUS.skipped) {
    return false;
  }

  const nowMs = Date.parse(now);
  if (job.status === NOTIFICATION_STATUS.sending) {
    return job.leaseUntil !== null && Date.parse(job.leaseUntil) <= nowMs;
  }

  return job.nextAttemptAt === null || Date.parse(job.nextAttemptAt) <= nowMs;
}

type RowJob = Readonly<{ rowNumber: number; job: NotificationOutboxJob }>;

export class GoogleSheetsNotificationOutboxRepository implements NotificationOutboxRepository {
  constructor(private readonly client: SheetsClient) {}

  private async readJobsWithRows(): Promise<readonly RowJob[]> {
    const rows = await this.client.getValues(`${SHEET.notifications}!A:ZZ`);
    const headerRow = rows[0] ?? [];
    const headers = createHeaderMap(headerRow, NOTIFICATION_HEADERS);
    const seenIds = new Set<string>();
    const result: RowJob[] = [];

    for (const [offset, row] of rows.slice(1).entries()) {
      const id = cell(row, headers, "NOTIFICATION_ID");
      if (!id) {
        continue;
      }
      if (seenIds.has(id)) {
        throw new SheetSchemaError(`Duplicate notification ID: ${id}`);
      }
      seenIds.add(id);

      const rawRegistrationId = cell(row, headers, "REGISTRATION_ID");
      if (!isRegistrationId(rawRegistrationId)) {
        throw new SheetSchemaError(`Invalid registration ID for notification ${id}.`);
      }
      const registrationId = asRegistrationId(rawRegistrationId);

      const rawType = cell(row, headers, "TYPE");
      if (!notificationTypes.has(rawType)) {
        throw new SheetSchemaError(`Invalid notification type for ${id}: ${rawType}`);
      }
      const type = rawType as NotificationType;
      if (id !== notificationJobId(registrationId, type)) {
        throw new SheetSchemaError(`Notification ID does not match registration/type for ${id}.`);
      }

      const rawStatus = cell(row, headers, "STATUS");
      if (!notificationStatuses.has(rawStatus)) {
        throw new SheetSchemaError(`Invalid notification status for ${id}: ${rawStatus}`);
      }
      const status = rawStatus as NotificationStatus;

      const attemptCount = Number(cell(row, headers, "ATTEMPT_COUNT"));
      if (!Number.isInteger(attemptCount) || attemptCount < 0) {
        throw new SheetSchemaError(`Invalid attempt count for notification ${id}.`);
      }

      const createdAt = cell(row, headers, "CREATED_AT");
      const updatedAt = cell(row, headers, "UPDATED_AT");
      if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
        throw new SheetSchemaError(`Invalid CREATED_AT for notification ${id}.`);
      }
      if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) {
        throw new SheetSchemaError(`Invalid UPDATED_AT for notification ${id}.`);
      }

      result.push({
        rowNumber: offset + 2,
        job: {
          id,
          registrationId,
          type,
          status,
          attemptCount,
          nextAttemptAt: parseOptionalTimestamp(
            cell(row, headers, "NEXT_ATTEMPT_AT"),
            "NEXT_ATTEMPT_AT",
            id,
          ),
          lastAttemptAt: parseOptionalTimestamp(
            cell(row, headers, "LAST_ATTEMPT_AT"),
            "LAST_ATTEMPT_AT",
            id,
          ),
          leaseToken: cell(row, headers, "LEASE_TOKEN") || null,
          leaseUntil: parseOptionalTimestamp(cell(row, headers, "LEASE_UNTIL"), "LEASE_UNTIL", id),
          errorCode: cell(row, headers, "ERROR_CODE") || null,
          createdAt,
          updatedAt,
          sentAt: parseOptionalTimestamp(cell(row, headers, "SENT_AT"), "SENT_AT", id),
        },
      });
    }

    return result;
  }

  private async updateJob(rowNumber: number, job: NotificationOutboxJob): Promise<void> {
    const headerRows = await this.client.getValues(`${SHEET.notifications}!1:1`);
    const headerRow = headerRows[0] ?? [];
    createHeaderMap(headerRow, NOTIFICATION_HEADERS);
    const row = buildRowByHeaders(headerRow, notificationToCells(job));
    const endColumn = columnLetter(Math.max(0, headerRow.length - 1));
    await this.client.updateValues(
      `${SHEET.notifications}!A${rowNumber}:${endColumn}${rowNumber}`,
      [row],
    );
  }

  async listAll(): Promise<readonly NotificationOutboxJob[]> {
    return (await this.readJobsWithRows()).map(({ job }) => job);
  }

  async listForRegistration(registrationId: RegistrationId): Promise<readonly NotificationOutboxJob[]> {
    return (await this.readJobsWithRows())
      .map(({ job }) => job)
      .filter((job) => job.registrationId === registrationId);
  }

  async create(job: NotificationOutboxJob): Promise<void> {
    const existing = (await this.readJobsWithRows()).find(({ job: candidate }) => candidate.id === job.id);
    if (existing) {
      return;
    }

    const headerRows = await this.client.getValues(`${SHEET.notifications}!1:1`);
    const headerRow = headerRows[0] ?? [];
    createHeaderMap(headerRow, NOTIFICATION_HEADERS);
    await this.client.appendValues(`${SHEET.notifications}!A:ZZ`, [
      buildRowByHeaders(headerRow, notificationToCells(job)),
    ]);
  }

  async claim(
    notificationId: string,
    now: string,
    leaseUntil: string,
    leaseToken: string,
  ): Promise<NotificationOutboxJob | null> {
    const current = (await this.readJobsWithRows()).find(({ job }) => job.id === notificationId);
    if (!current || !canClaim(current.job, now)) {
      return null;
    }

    const claimed: NotificationOutboxJob = {
      ...current.job,
      status: NOTIFICATION_STATUS.sending,
      attemptCount: current.job.attemptCount + 1,
      nextAttemptAt: null,
      lastAttemptAt: now,
      leaseToken,
      leaseUntil,
      errorCode: null,
      updatedAt: now,
    };
    await this.updateJob(current.rowNumber, claimed);

    const verified = (await this.readJobsWithRows()).find(({ job }) => job.id === notificationId)?.job;
    return verified?.status === NOTIFICATION_STATUS.sending && verified.leaseToken === leaseToken
      ? verified
      : null;
  }

  async markSent(notificationId: string, leaseToken: string, sentAt: string): Promise<void> {
    const current = (await this.readJobsWithRows()).find(({ job }) => job.id === notificationId);
    if (
      !current ||
      current.job.status !== NOTIFICATION_STATUS.sending ||
      current.job.leaseToken !== leaseToken
    ) {
      return;
    }

    await this.updateJob(current.rowNumber, {
      ...current.job,
      status: NOTIFICATION_STATUS.sent,
      nextAttemptAt: null,
      leaseToken: null,
      leaseUntil: null,
      errorCode: null,
      updatedAt: sentAt,
      sentAt,
    });
  }

  async markFailed(
    notificationId: string,
    leaseToken: string,
    failedAt: string,
    errorCode: string,
    nextAttemptAt: string,
  ): Promise<void> {
    const current = (await this.readJobsWithRows()).find(({ job }) => job.id === notificationId);
    if (
      !current ||
      current.job.status !== NOTIFICATION_STATUS.sending ||
      current.job.leaseToken !== leaseToken
    ) {
      return;
    }

    await this.updateJob(current.rowNumber, {
      ...current.job,
      status: NOTIFICATION_STATUS.failed,
      nextAttemptAt,
      leaseToken: null,
      leaseUntil: null,
      errorCode,
      updatedAt: failedAt,
    });
  }

  async makeFailedJobsDue(now: string): Promise<number> {
    const failed = (await this.readJobsWithRows()).filter(
      ({ job }) => job.status === NOTIFICATION_STATUS.failed,
    );
    for (const current of failed) {
      await this.updateJob(current.rowNumber, {
        ...current.job,
        nextAttemptAt: now,
        updatedAt: now,
      });
    }
    return failed.length;
  }
}
