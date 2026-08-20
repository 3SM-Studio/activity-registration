import type { EmailMessage, EmailSender } from "@/application/registration-notifications";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

type FetchLike = typeof fetch;

export class ResendEmailError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ResendEmailError";
  }
}

function responseId(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("id" in value)) {
    return null;
  }

  return typeof value.id === "string" && value.id.length > 0 ? value.id : null;
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async send(message: EmailMessage): Promise<Readonly<{ id: string }>> {
    const response = await this.fetchImpl(RESEND_EMAILS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [...message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.attachments
          ? {
              attachments: message.attachments.map((attachment) => ({
                path: attachment.path,
                filename: attachment.filename,
                ...(attachment.contentId ? { content_id: attachment.contentId } : {}),
              })),
            }
          : {}),
      }),
    });

    let payload: unknown = null;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new ResendEmailError("Resend rejected the email request.", response.status);
    }

    const id = responseId(payload);
    if (!id) {
      throw new ResendEmailError("Resend returned an invalid email response.", response.status);
    }

    return { id };
  }
}
