import { expect, test, type Page } from "@playwright/test";

async function openRegistrationForm(page: Page) {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}

function combobox(page: Page, name: RegExp) {
  return page.getByRole("combobox", { name });
}

async function chooseOption(page: Page, fieldName: RegExp, optionName: string) {
  const trigger = combobox(page, fieldName);
  await trigger.click();
  const option = page.getByRole("option", { name: optionName, exact: true });
  await expect(option).toBeVisible();
  await option.click();
}

async function fillAdultRegistration(page: Page) {
  await chooseOption(page, /Miasto/, "Gdynia");
  await chooseOption(page, /Zajęcia/, "Hip-hop");
  await page.getByLabel(/^Imię \*/).fill("Jan");
  await page.getByLabel(/^Nazwisko \*/).fill("Kowalski");
  await page.getByLabel(/^Wiek/).fill("18");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("jan@example.com");
}

test("filters offerings by city and submits a minor registration", async ({ page }) => {
  await openRegistrationForm(page);

  const offering = combobox(page, /Zajęcia/);
  await expect(offering).toBeDisabled();

  await chooseOption(page, /Miasto/, "Gdynia");
  await expect(offering).toBeEnabled();

  await offering.click();
  await expect(page.getByRole("option", { name: "Hip-hop", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Contemporary", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Choreografia", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: "Contemporary", exact: true }).click();

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

test("formats a Polish phone number and exposes the country selector", async ({ page }) => {
  await openRegistrationForm(page);

  const phone = page.getByLabel(/Numer telefonu/);
  const country = page.locator(".PhoneInputCountrySelect");

  await expect(country).toHaveValue("PL");
  await phone.fill("500000000");
  await expect(phone).toHaveValue("+48 500 000 000");
});

test("changing city clears the previously selected offering", async ({ page }) => {
  await openRegistrationForm(page);

  const offering = combobox(page, /Zajęcia/);

  await chooseOption(page, /Miasto/, "Gdynia");
  await chooseOption(page, /Zajęcia/, "Hip-hop");
  await expect(offering).toContainText("Hip-hop");

  await chooseOption(page, /Miasto/, "Sopot");

  await expect(offering).toContainText("Wybierz zajęcia");
  await offering.click();
  await expect(page.getByRole("option", { name: "Choreografia", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Contemporary", exact: true })).toHaveCount(0);
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

  const offering = combobox(page, /Zajęcia/);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(offering).toContainText("Wybierz zajęcia");
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

test("shows validation summary without focusing an input after invalid submit", async ({
  page,
}) => {
  await openRegistrationForm(page);
  await page.waitForTimeout(850);

  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  const summary = page.locator("[data-validation-summary]");
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(combobox(page, /Miasto/)).not.toBeFocused();
});

test("handles accidental honeypot autofill without focusing the hidden field", async ({ page }) => {
  await openRegistrationForm(page);
  await fillAdultRegistration(page);

  const honeypot = page.locator('input[name="website"]');
  await honeypot.evaluate((input: HTMLInputElement) => {
    input.readOnly = false;
  });
  await honeypot.fill("https://autofill.example");

  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  const summary = page.locator("[data-validation-summary]");
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(honeypot).not.toBeFocused();
  await expect(page.getByText("Dziękujemy. Zgłoszenie zostało wysłane.")).toHaveCount(0);
});

test("does not overflow the viewport horizontally", async ({ page }) => {
  await openRegistrationForm(page);

  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
});
