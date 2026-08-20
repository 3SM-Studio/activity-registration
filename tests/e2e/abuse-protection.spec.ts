import { expect, test } from "@playwright/test";

function validRegistration(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    requestId: crypto.randomUUID(),
    cityId: "gdynia",
    offeringId: "gdynia-hiphop",
    participantFirstName: "Jan",
    participantLastName: "Testowy",
    birthDate: "2000-01-15",
    phone: "500 000 000",
    email: "jan.testowy@example.com",
    renderedAt: Date.now() - 2_000,
    website: "",
    ...overrides,
  };
}

test("rejects a honeypot payload before creating a registration", async ({ request }) => {
  const response = await request.post("/api/registrations", {
    data: validRegistration({ website: "https://bot.example" }),
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    ok: false,
    code: "VALIDATION_ERROR",
  });
});

test("rejects an impossibly fast form submission before persistence", async ({ request }) => {
  const response = await request.post("/api/registrations", {
    data: validRegistration({ renderedAt: Date.now() }),
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    ok: false,
    code: "VALIDATION_ERROR",
    message: "Formularz został wysłany zbyt szybko.",
  });
});
