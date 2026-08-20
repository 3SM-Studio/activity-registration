import { describe, expect, it } from "vitest";

import type { EmailMessage } from "@/application/registration-notifications";
import { ResendEmailError, ResendEmailSender } from "@/infrastructure/email/resend-email-sender";

const message: EmailMessage = {
  from: "Pozytywka <zapisy@example.com>",
  to: ["parent@example.com"],
  replyTo: "reply@example.com",
  subject: "Test",
  text: "Plain text",
  html: '<img src="cid:pozytywka-logo" alt="Pozytywka" />',
  idempotencyKey: "registration-confirmation/reg_123",
  attachments: [
    {
      path: "https://example.com/pozytywka-logo.webp",
      filename: "pozytywka-logo.webp",
      contentId: "pozytywka-logo",
    },
  ],
};

describe("ResendEmailSender", () => {
  it("sends the expected Resend request with an idempotency key and inline attachments", async () => {
    const calls: Array<Readonly<{ input: RequestInfo | URL; init?: RequestInit }>> = [];
    const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, ...(init ? { init } : {}) });
      return new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sender = new ResendEmailSender("re_test", fetchStub);
    await expect(sender.send(message)).resolves.toEqual({ id: "email_123" });

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.input)).toBe("https://api.resend.com/emails");

    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test");
    expect(headers.get("idempotency-key")).toBe(message.idempotencyKey);

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      from: message.from,
      to: ["parent@example.com"],
      subject: "Test",
      text: "Plain text",
      html: '<img src="cid:pozytywka-logo" alt="Pozytywka" />',
      reply_to: "reply@example.com",
      attachments: [
        {
          path: "https://example.com/pozytywka-logo.webp",
          filename: "pozytywka-logo.webp",
          content_id: "pozytywka-logo",
        },
      ],
    });
  });

  it("turns a rejected provider response into a typed error", async () => {
    const fetchStub = (async () =>
      new Response(JSON.stringify({ message: "rejected" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    const sender = new ResendEmailSender("re_test", fetchStub);

    await expect(sender.send(message)).rejects.toEqual(
      expect.objectContaining<Partial<ResendEmailError>>({
        name: "ResendEmailError",
        status: 403,
      }),
    );
  });
});
