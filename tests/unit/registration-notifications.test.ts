import { describe, expect, it } from "vitest";

import {
  ADMIN_REGISTRATION_EMAIL_ENABLED,
  REGISTRATION_REPLY_TO_EMAIL,
  buildRegistrationNotificationMessages,
  enabledRegistrationNotificationTypes,
  sendRegistrationNotifications,
  type EmailMessage,
  type EmailSender,
} from "@/application/registration-notifications";
import { asCityId, asOfferingId, asSeasonId } from "@/domain/catalog";
import { NOTIFICATION_TYPE } from "@/domain/notification-outbox";
import {
  REGISTRATION_SCHEMA_VERSION,
  REGISTRATION_SOURCE,
  REGISTRATION_STATUS,
  asRegistrationId,
  asRequestId,
  type Registration,
} from "@/domain/registration";

function registration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: asRegistrationId("reg_11111111-1111-4111-8111-111111111111"),
    requestId: asRequestId("22222222-2222-4222-8222-222222222222"),
    submittedAt: "2026-08-18T18:00:00.000Z",
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
    createdAt: "2026-08-18T18:00:00.000Z",
    updatedAt: "2026-08-18T18:00:00.000Z",
    schemaVersion: REGISTRATION_SCHEMA_VERSION,
    ...overrides,
  };
}

class RecordingSender implements EmailSender {
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<Readonly<{ id: string }>> {
    this.messages.push(message);
    return { id: `email-${this.messages.length}` };
  }
}

describe("registration notifications", () => {
  it("keeps the administrative registration email disabled", () => {
    expect(ADMIN_REGISTRATION_EMAIL_ENABLED).toBe(false);
    expect(enabledRegistrationNotificationTypes()).toEqual([NOTIFICATION_TYPE.confirmation]);
  });

  it("routes participant replies directly to Pozytywka", () => {
    expect(REGISTRATION_REPLY_TO_EMAIL).toBe("pozytywka.boleslaw@gmail.com");
  });

  it("builds only the participant confirmation while admin email is disabled", async () => {
    const messages = await buildRegistrationNotificationMessages(registration(), {
      from: "Pozytywka <zapisy@example.com>",
      adminEmails: ["biuro@example.com"],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      to: ["anna@example.com"],
      replyTo: "pozytywka.boleslaw@gmail.com",
      idempotencyKey: "registration-confirmation/reg_11111111-1111-4111-8111-111111111111",
      attachments: [
        {
          filename: "pozytywka-email-logo.png",
          contentId: "pozytywka-logo",
        },
      ],
    });
    expect(messages[0]?.html).toContain("<!DOCTYPE");
    expect(messages[0]?.html).toContain('src="cid:pozytywka-logo"');
    expect(messages[0]?.html).toContain('alt="Pozytywka"');
    expect(messages[0]?.html).toContain("Zgłoszenie otrzymane");
    expect(messages[0]?.html).toContain("Co dzieje się teraz?");
    expect(messages[0]?.text).toContain("nie potwierdzenie miejsca na zajęciach");
    expect(messages[0]?.html).not.toContain("Numer zgłoszenia");
    expect(messages[0]?.text).not.toContain("Numer zgłoszenia");
    expect(messages[0]?.html).not.toContain("reg_11111111-1111-4111-8111-111111111111");
    expect(messages[0]?.text).not.toContain("reg_11111111-1111-4111-8111-111111111111");
    expect(
      messages.some((message) => message.idempotencyKey.startsWith("registration-admin/")),
    ).toBe(false);
  });

  it("does not expose duplicate warnings to the participant email", async () => {
    const messages = await buildRegistrationNotificationMessages(
      registration({
        possibleDuplicateOf: asRegistrationId("reg_33333333-3333-4333-8333-333333333333"),
      }),
      {
        from: "Pozytywka <zapisy@example.com>",
        adminEmails: ["biuro@example.com"],
      },
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).not.toMatch(/duplikat/i);
    expect(messages[0]?.html).not.toMatch(/duplikat/i);
  });

  it("escapes participant-controlled values in rendered HTML", async () => {
    const messages = await buildRegistrationNotificationMessages(
      registration({ participantFirstName: "<script>alert(1)</script>" }),
      {
        from: "Pozytywka <zapisy@example.com>",
        adminEmails: ["biuro@example.com"],
      },
    );

    expect(messages[0]?.html).not.toContain("<script>alert(1)</script>");
    expect(messages[0]?.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("attempts only the participant confirmation", async () => {
    const sender = new RecordingSender();

    const result = await sendRegistrationNotifications(registration(), {
      sender,
      from: "Pozytywka <zapisy@example.com>",
      adminEmails: ["biuro@example.com"],
    });

    expect(sender.messages).toHaveLength(1);
    expect(sender.messages[0]?.idempotencyKey).toMatch(/^registration-confirmation\//);
    expect(sender.messages[0]?.replyTo).toBe("pozytywka.boleslaw@gmail.com");
    expect(result).toEqual({ attempted: 1, failed: 0 });
  });
});
