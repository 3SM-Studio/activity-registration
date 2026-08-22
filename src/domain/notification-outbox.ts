import type { RegistrationId } from "@/domain/registration";

export const NOTIFICATION_TYPE = {
  confirmation: "CONFIRMATION",
  admin: "ADMIN",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_STATUS = {
  pending: "PENDING",
  sending: "SENDING",
  sent: "SENT",
  failed: "FAILED",
  skipped: "SKIPPED",
} as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export type NotificationOutboxJob = Readonly<{
  id: string;
  registrationId: RegistrationId;
  type: NotificationType;
  status: NotificationStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  leaseToken: string | null;
  leaseUntil: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}>;

export function notificationJobId(registrationId: RegistrationId, type: NotificationType): string {
  return type === NOTIFICATION_TYPE.confirmation
    ? `registration-confirmation/${registrationId}`
    : `registration-admin/${registrationId}`;
}

export function notificationTypeForIdempotencyKey(idempotencyKey: string): NotificationType | null {
  if (idempotencyKey.startsWith("registration-confirmation/")) {
    return NOTIFICATION_TYPE.confirmation;
  }
  if (idempotencyKey.startsWith("registration-admin/")) {
    return NOTIFICATION_TYPE.admin;
  }
  return null;
}

export function isTerminalNotificationStatus(status: NotificationStatus): boolean {
  return status === NOTIFICATION_STATUS.sent || status === NOTIFICATION_STATUS.skipped;
}
