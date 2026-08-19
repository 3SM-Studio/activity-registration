import { createElement, type ReactElement } from "react";
import { render, toPlainText } from "react-email";

import type { Registration } from "@/domain/registration";
import { RegistrationAdminEmail } from "@/emails/registration-admin-email";
import { RegistrationConfirmationEmail } from "@/emails/registration-confirmation-email";

export type EmailMessage = Readonly<{
  from: string;
  to: readonly string[];
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  replyTo?: string;
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

function participantName(registration: Registration): string {
  return `${registration.participantFirstName} ${registration.participantLastName}`;
}

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
  };
}

async function adminMessage(
  registration: Registration,
  from: string,
  adminEmails: readonly string[],
): Promise<EmailMessage> {
  const rendered = await renderTemplate(createElement(RegistrationAdminEmail, { registration }));
  const name = participantName(registration);

  return {
    from,
    to: adminEmails,
    replyTo: registration.email,
    subject: `Nowe zgłoszenie: ${name} - ${registration.offeringNameSnapshot}`,
    text: rendered.text,
    html: rendered.html,
    idempotencyKey: `registration-admin/${registration.id}`,
  };
}

export async function buildRegistrationNotificationMessages(
  registration: Registration,
  dependencies: Pick<RegistrationNotificationDependencies, "from" | "adminEmails">,
): Promise<readonly EmailMessage[]> {
  return Promise.all([
    confirmationMessage(registration, dependencies.from),
    adminMessage(registration, dependencies.from, dependencies.adminEmails),
  ]);
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
