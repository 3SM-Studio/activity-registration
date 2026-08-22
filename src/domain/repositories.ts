import type { InternalGroup, OfferingId, PublicCatalog, Season, SeasonId } from "@/domain/catalog";
import type { NotificationOutboxJob } from "@/domain/notification-outbox";
import type { RegistrationDuplicateCriteria } from "@/domain/registration-duplicates";
import type { Registration, RegistrationId, RequestId } from "@/domain/registration";
import type { PublicSettings } from "@/domain/settings";

export interface CatalogRepository {
  getPublicCatalog(currentDate: string, seasonId: SeasonId): Promise<PublicCatalog>;
  findSeasonById(seasonId: SeasonId): Promise<Season | null>;
  findGroupsForOffering(
    seasonId: SeasonId,
    offeringId: OfferingId,
  ): Promise<readonly InternalGroup[]>;
}

export interface RegistrationRepository {
  findByRequestId(requestId: RequestId): Promise<Registration | null>;
  findPotentialDuplicates(
    criteria: RegistrationDuplicateCriteria,
  ): Promise<readonly Registration[]>;
  create(registration: Registration): Promise<void>;
  listAll?(): Promise<readonly Registration[]>;
}

export interface NotificationOutboxRepository {
  listAll(): Promise<readonly NotificationOutboxJob[]>;
  listForRegistration(registrationId: RegistrationId): Promise<readonly NotificationOutboxJob[]>;
  create(job: NotificationOutboxJob): Promise<void>;
  claim(
    notificationId: string,
    now: string,
    leaseUntil: string,
    leaseToken: string,
  ): Promise<NotificationOutboxJob | null>;
  markSent(notificationId: string, leaseToken: string, sentAt: string): Promise<void>;
  markFailed(
    notificationId: string,
    leaseToken: string,
    failedAt: string,
    errorCode: string,
    nextAttemptAt: string,
  ): Promise<void>;
  makeFailedJobsDue(now: string): Promise<number>;
}

export interface SettingsRepository {
  getPublicSettings(): Promise<PublicSettings>;
}

export type ApplicationRepositories = Readonly<{
  catalog: CatalogRepository;
  registrations: RegistrationRepository;
  settings: SettingsRepository;
  notifications?: NotificationOutboxRepository;
}>;
