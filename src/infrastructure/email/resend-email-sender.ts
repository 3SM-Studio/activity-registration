import type { EmailMessage, EmailSender } from "@/application/registration-notifications";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const RESEND_REQUEST_TIMEOUT_MS = 10_000;
const RESEND_USER_AGENT = "pozytywka-activity-registration/1.0";

type FetchLike = typeof fetch;

export class ResendEmailError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly providerCode: string | null = null,
    readonly retryAfterMs: number | null = null,
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

function stringProperty(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" && property.length > 0 ? property : null;
}

function providerErrorCode(value: unknown): string | null {
  return (
    stringProperty(value, "name") ?? stringProperty(value, "type") ?? stringProperty(value, "code")
  );
}

function delayHeaderMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(0, timestamp - Date.now());
}

function retryAfterMs(response: Response): number | null {
  return (
    delayHeaderMs(response.headers.get("retry-after")) ??
    delayHeaderMs(response.headers.get("ratelimit-reset"))
  );
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async send(message: EmailMessage): Promise<Readonly<{ id: string }>> {
    let response: Response;

    try {
      response = await this.fetchImpl(RESEND_EMAILS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
          "User-Agent": RESEND_USER_AGENT,
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
        signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ResendEmailError("Resend request failed or timed out.", null, "request_failed");
    }

    let payload: unknown = null;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new ResendEmailError(
        "Resend rejected the email request.",
        response.status,
        providerErrorCode(payload),
        retryAfterMs(response),
      );
    }

    const id = responseId(payload);
    if (!id) {
      throw new ResendEmailError(
        "Resend returned an invalid email response.",
        response.status,
        "invalid_response",
      );
    }

    return { id };
  }
}
