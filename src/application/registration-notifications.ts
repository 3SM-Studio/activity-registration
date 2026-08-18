import type { Registration } from "@/domain/registration";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function participantName(registration: Registration): string {
  return `${registration.participantFirstName} ${registration.participantLastName}`;
}

function guardianLine(registration: Registration): string | null {
  if (!registration.guardianFirstName || !registration.guardianLastName) {
    return null;
  }

  return `${registration.guardianFirstName} ${registration.guardianLastName}`;
}

function confirmationMessage(
  registration: Registration,
  from: string,
): EmailMessage {
  const name = participantName(registration);
  const text = [
    "Dziękujemy za zgłoszenie do Pracowni Twórczej Pozytywka.",
    "",
    `Uczestnik: ${name}`,
    `Zajęcia: ${registration.offeringNameSnapshot}`,
    `Miasto: ${registration.cityNameSnapshot}`,
    `Numer zgłoszenia: ${registration.id}`,
    "",
    "Zgłoszenie zostało zapisane. Jeśli będziemy potrzebowali dodatkowych informacji, skontaktujemy się z Tobą.",
    "",
    "To jest potwierdzenie otrzymania zgłoszenia, a nie potwierdzenie miejsca na zajęciach.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#29172d;max-width:640px;margin:0 auto">
      <h1 style="font-size:24px;margin:0 0 16px">Dziękujemy za zgłoszenie</h1>
      <p>Otrzymaliśmy zgłoszenie do <strong>Pracowni Twórczej Pozytywka</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:20px 0">
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Uczestnik</td><td style="padding:6px 0"><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Zajęcia</td><td style="padding:6px 0">${escapeHtml(registration.offeringNameSnapshot)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Miasto</td><td style="padding:6px 0">${escapeHtml(registration.cityNameSnapshot)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Numer zgłoszenia</td><td style="padding:6px 0">${escapeHtml(registration.id)}</td></tr>
      </table>
      <p>Zgłoszenie zostało zapisane. Jeśli będziemy potrzebowali dodatkowych informacji, skontaktujemy się z Tobą.</p>
      <p style="font-size:14px;color:#74616f">To jest potwierdzenie otrzymania zgłoszenia, a nie potwierdzenie miejsca na zajęciach.</p>
    </div>
  `.trim();

  return {
    from,
    to: [registration.email],
    subject: "Pozytywka: otrzymaliśmy Twoje zgłoszenie",
    text,
    html,
    idempotencyKey: `registration-confirmation/${registration.id}`,
  };
}

function adminMessage(
  registration: Registration,
  from: string,
  adminEmails: readonly string[],
): EmailMessage {
  const name = participantName(registration);
  const guardian = guardianLine(registration);
  const text = [
    "Nowe zgłoszenie do Pracowni Twórczej Pozytywka",
    "",
    `Uczestnik: ${name}`,
    `Wiek: ${registration.age}`,
    `Zajęcia: ${registration.offeringNameSnapshot}`,
    `Miasto: ${registration.cityNameSnapshot}`,
    ...(guardian ? [`Rodzic/opiekun: ${guardian}`] : []),
    `Telefon: ${registration.phone}`,
    `E-mail: ${registration.email}`,
    `Numer zgłoszenia: ${registration.id}`,
    `Wysłano: ${registration.submittedAt}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#29172d;max-width:680px;margin:0 auto">
      <h1 style="font-size:24px;margin:0 0 16px">Nowe zgłoszenie</h1>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Uczestnik</td><td style="padding:6px 0"><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Wiek</td><td style="padding:6px 0">${registration.age}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Zajęcia</td><td style="padding:6px 0">${escapeHtml(registration.offeringNameSnapshot)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Miasto</td><td style="padding:6px 0">${escapeHtml(registration.cityNameSnapshot)}</td></tr>
        ${guardian ? `<tr><td style="padding:6px 12px 6px 0;color:#74616f">Rodzic/opiekun</td><td style="padding:6px 0">${escapeHtml(guardian)}</td></tr>` : ""}
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Telefon</td><td style="padding:6px 0">${escapeHtml(registration.phone)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">E-mail</td><td style="padding:6px 0">${escapeHtml(registration.email)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Numer zgłoszenia</td><td style="padding:6px 0">${escapeHtml(registration.id)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#74616f">Wysłano</td><td style="padding:6px 0">${escapeHtml(registration.submittedAt)}</td></tr>
      </table>
    </div>
  `.trim();

  return {
    from,
    to: adminEmails,
    replyTo: registration.email,
    subject: `Nowe zgłoszenie: ${name} - ${registration.offeringNameSnapshot}`,
    text,
    html,
    idempotencyKey: `registration-admin/${registration.id}`,
  };
}

export function buildRegistrationNotificationMessages(
  registration: Registration,
  dependencies: Pick<RegistrationNotificationDependencies, "from" | "adminEmails">,
): readonly EmailMessage[] {
  return [
    confirmationMessage(registration, dependencies.from),
    adminMessage(registration, dependencies.from, dependencies.adminEmails),
  ];
}

export async function sendRegistrationNotifications(
  registration: Registration,
  dependencies: RegistrationNotificationDependencies,
): Promise<RegistrationNotificationResult> {
  const messages = buildRegistrationNotificationMessages(registration, dependencies);
  const results = await Promise.allSettled(messages.map((message) => dependencies.sender.send(message)));

  return {
    attempted: results.length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
