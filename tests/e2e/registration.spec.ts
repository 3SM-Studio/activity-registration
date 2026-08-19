import { expect, test, type Page } from "@playwright/test";

async function openRegistrationForm(page: Page) {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}

async function fillAdultRegistration(page: Page) {
  await page.getByLabel(/Miasto/).selectOption("gdynia");
  await page.getByLabel(/Zajęcia/).selectOption("gdynia-hiphop");
  await page.getByLabel(/^Imię \*/).fill("Jan");
  await page.getByLabel(/^Nazwisko \*/).fill("Kowalski");
  await page.getByLabel(/^Wiek/).fill("18");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("jan@example.com");
}

test("filters offerings by city and submits a minor registration", async ({ page }) => {
  await openRegistrationForm(page);

  const offering = page.getByLabel(/Zajęcia/);
  await expect(offering).toBeDisabled();

  await page.getByLabel(/Miasto/).selectOption("gdynia");
  await expect(offering).toBeEnabled();

  const options = await offering.locator("option").allTextContents();
  expect(options).toContain("Hip-hop");
  expect(options).toContain("Contemporary");
  expect(options).not.toContain("Choreografia");

  await offering.selectOption("gdynia-contemporary");
  await page.getByLabel(/^Imię \*/).fill("Jan");
  await page.getByLabel(/^Nazwisko \*/).fill("Kowalski");
  await page.getByLabel(/^Wiek/).fill("17");

  await page.getByLabel(/Imię rodzica/).fill("Anna");
  await page.getByLabel(/Nazwisko rodzica/).fill("Kowalska");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("anna@example.com");

  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(page.getByText("Dziękujemy. Zgłoszenie zostało wysłane.")).toBeVisible();
});

test("changing city clears the previously selected offering", async ({ page }) => {
  await openRegistrationForm(page);

  const city = page.getByLabel(/Miasto/);
  const offering = page.getByLabel(/Zajęcia/);

  await city.selectOption("gdynia");
  await offering.selectOption("gdynia-hiphop");
  await expect(offering).toHaveValue("gdynia-hiphop");

  await city.selectOption("sopot");

  await expect(offering).toHaveValue("");
  const options = await offering.locator("option").allTextContents();
  expect(options).toContain("Choreografia");
  expect(options).not.toContain("Contemporary");
});

test("switching from minor to adult clears guardian UI", async ({ page }) => {
  await openRegistrationForm(page);

  const age = page.getByLabel(/^Wiek/);
  await age.fill("17");
  await expect(page.getByLabel(/Imię rodzica/)).toBeVisible();

  await page.getByLabel(/Imię rodzica/).fill("Anna");
  await page.getByLabel(/Nazwisko rodzica/).fill("Kowalska");
  await age.fill("18");

  await expect(page.getByLabel(/Imię rodzica/)).toHaveCount(0);
  await expect(page.getByLabel(/Nazwisko rodzica/)).toHaveCount(0);
});

test("clears a stale offering after the server rejects it", async ({ page }) => {
  await page.route("**/api/registrations", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        code: "OFFERING_NOT_AVAILABLE",
        message: "Wybrane zajęcia nie są już dostępne.",
      }),
    });
  });

  await openRegistrationForm(page);
  await fillAdultRegistration(page);

  const offering = page.getByLabel(/Zajęcia/);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(offering).toHaveValue("");
  await expect(page.getByText("Wybrane zajęcia nie są już dostępne.").first()).toBeVisible();
});

test("reuses the same requestId after a temporary transport failure", async ({ page }) => {
  const requestIds: string[] = [];
  let attempt = 0;

  await page.route("**/api/registrations", async (route) => {
    attempt += 1;
    const body = route.request().postDataJSON() as { requestId?: unknown };
    if (typeof body.requestId === "string") {
      requestIds.push(body.requestId);
    }

    if (attempt === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "TEMPORARY_UNAVAILABLE",
          message: "System jest chwilowo niedostępny. Spróbuj ponownie.",
        }),
      });
      return;
    }

    await route.continue();
  });

  await openRegistrationForm(page);
  await fillAdultRegistration(page);
  await page.waitForTimeout(850);

  const submit = page.getByRole("button", { name: "Wyślij zgłoszenie" });
  await submit.click();
  await expect(page.getByText("System jest chwilowo niedostępny. Spróbuj ponownie.")).toBeVisible();

  await submit.click();
  await expect(page.getByText("Dziękujemy. Zgłoszenie zostało wysłane.")).toBeVisible();

  expect(requestIds).toHaveLength(2);
  expect(requestIds[0]).toBe(requestIds[1]);
});

test("focuses the first invalid field after an invalid submit", async ({ page }) => {
  await openRegistrationForm(page);
  await page.waitForTimeout(850);

  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(page.getByLabel(/Miasto/)).toBeFocused();
});

test("does not overflow the viewport horizontally", async ({ page }) => {
  await openRegistrationForm(page);

  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
});
