import { createElement, type ReactElement } from "react";
import { render, toPlainText } from "react-email";

import type { Registration } from "@/domain/registration";
import { POZYTYWKA_EMAIL_LOGO_ATTACHMENT } from "@/emails/email-brand-assets";
import { RegistrationAdminEmail } from "@/emails/registration-admin-email";
import { RegistrationConfirmationEmail } from "@/emails/registration-confirmation-email";

export const ADMIN_REGISTRATION_EMAIL_ENABLED = false;

export type EmailAttachment = Readonly<{
  path: string;
  filename: string;
  contentId?: string;
}>;

export type EmailMessage = Readonly<{
  from: string;
  to: readonly string[];
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  replyTo?: string;
  attachments?: readonly EmailAttachment[];
}>;

export interface EmailSender {
  send(message: EmailMessage): Promise<Readonly<{ id: string }>>;
}

export type RegistrationNotificationDependencies = Readonly<{
  sender: EmailSender;
  from: string;
  adminEmails: readonly string[];
}>;

export type RegistrationNotificationResult = Readonly<{
  attempted: number;
  failed: number;
}>;

async function renderTemplate(
  template: ReactElement,
): Promise<Readonly<{ html: string; text: string }>> {
  const html = await render(template);
  return {
    html,
    text: toPlainText(html),
  };
}

async function confirmationMessage(
  registration: Registration,
  from: string,
): Promise<EmailMessage> {
  const rendered = await renderTemplate(
    createElement(RegistrationConfirmationEmail, { registration }),
  );

  return {
    from,
    to: [registration.email],
    subject: "Pozytywka: otrzymaliśmy Twoje zgłoszenie",
    text: rendered.text,
    html: rendered.html,
    idempotencyKey: `registration-confirmation/${registration.id}`,
    attachments: [POZYTYWKA_EMAIL_LOGO_ATTACHMENT],
  };
}

async function adminMessage(
  registration: Registration,
  from: string,
  adminEmails: readonly string[],
): Promise<EmailMessage> {
  const rendered = await renderTemplate(createElement(RegistrationAdminEmail, { registration }));

  return {
    from,
    to: adminEmails,
    subject: `Nowe zgłoszenie - ${registration.offeringNameSnapshot} - ${registration.cityNameSnapshot}`,
    text: rendered.text,
    html: rendered.html,
    idempotencyKey: `registration-admin/${registration.id}`,
    attachments: [POZYTYWKA_EMAIL_LOGO_ATTACHMENT],
  };
}

export async function buildRegistrationNotificationMessages(
  registration: Registration,
  dependencies: Pick<RegistrationNotificationDependencies, "from" | "adminEmails">,
): Promise<readonly EmailMessage[]> {
  const messages: Promise<EmailMessage>[] = [confirmationMessage(registration, dependencies.from)];

  if (ADMIN_REGISTRATION_EMAIL_ENABLED) {
    messages.push(adminMessage(registration, dependencies.from, dependencies.adminEmails));
  }

  return Promise.all(messages);
}

export async function sendRegistrationNotifications(
  registration: Registration,
  dependencies: RegistrationNotificationDependencies,
): Promise<RegistrationNotificationResult> {
  const messages = await buildRegistrationNotificationMessages(registration, dependencies);
  const results = await Promise.allSettled(
    messages.map((message) => dependencies.sender.send(message)),
  );

  return {
    attempted: results.length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
