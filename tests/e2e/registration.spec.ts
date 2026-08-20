import { expect, test, type Page, type TestInfo } from "@playwright/test";

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

async function chooseBirthDate(page: Page, year: string, monthIndex: number, day: string) {
  await page.getByRole("button", { name: /Data urodzenia/ }).click();
  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();

  const dropdowns = calendar.locator("select");
  await expect(dropdowns).toHaveCount(2);
  await dropdowns.nth(1).selectOption({ label: year });
  await dropdowns.nth(0).selectOption({ index: monthIndex });

  const dayButton = calendar.locator("button[data-day]").filter({
    hasText: new RegExp(`^${day}$`),
  });
  await expect(dayButton).toHaveCount(1);
  await dayButton.click();
}

function e2eIdentitySuffix(testInfo: TestInfo): string {
  const project =
    testInfo.project.name === "mobile-320"
      ? "Telefon"
      : testInfo.project.name === "mobile-430"
        ? "Mobilny"
        : "Desktop";
  const retry = testInfo.retry === 0 ? "Pierwszy" : testInfo.retry === 1 ? "Drugi" : "Trzeci";
  const run = Date.now().toString().slice(-6);
  return `${project} ${retry} ${run}`;
}

async function fillAdultRegistration(page: Page, identitySuffix = "Standard") {
  await chooseOption(page, /Miasto/, "Gdynia");
  await chooseOption(page, /Zajęcia/, "Hip-hop");
  await page.getByLabel(/^Imię \*/).fill("Jan");
  await page.getByLabel(/^Nazwisko \*/).fill(`Kowalski ${identitySuffix}`);
  await chooseBirthDate(page, "2000", 0, "15");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("jan@example.com");
}

async function mockSuccessfulRegistration(page: Page) {
  await page.route("**/api/registrations", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        registrationId: crypto.randomUUID(),
        duplicate: false,
      }),
    });
  });
}

test("filters offerings by city and submits a minor registration", async ({ page }, testInfo) => {
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
  await page.getByLabel(/^Nazwisko \*/).fill(`Kowalski ${e2eIdentitySuffix(testInfo)}`);
  await chooseBirthDate(page, "2012", 0, "15");

  await page.getByLabel(/Imię rodzica/).fill("Anna");
  await page.getByLabel(/Nazwisko rodzica/).fill("Kowalska");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("anna@example.com");

  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(page.getByRole("heading", { name: "Dziękujemy, mamy zgłoszenie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Co dalej?" })).toBeVisible();
  await expect(page.getByText(/nie oznacza jeszcze potwierdzenia miejsca/i)).toBeVisible();
});

test("selects a birth date with the shadcn date picker", async ({ page }) => {
  await openRegistrationForm(page);

  await chooseBirthDate(page, "2000", 0, "15");

  await expect(page.getByRole("button", { name: /Data urodzenia/ })).toContainText("15");
  await expect(page.getByRole("button", { name: /Data urodzenia/ })).toContainText("2000");
});

test("formats a Polish phone number and uses the shadcn country selector", async ({ page }) => {
  await openRegistrationForm(page);

  const phone = page.getByLabel(/Numer telefonu/);
  const country = combobox(page, /Kraj numeru telefonu/);

  await expect(country).toContainText("+48");
  await phone.fill("500000000");
  await expect(phone).toHaveValue("500 000 000");

  await country.click();
  await expect(page.getByRole("option", { name: /Niemcy.*\+49/ })).toBeVisible();
  await page.keyboard.press("Escape");
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

test("switching from minor to adult birth date clears guardian UI", async ({ page }) => {
  await openRegistrationForm(page);

  await chooseBirthDate(page, "2012", 0, "15");
  await expect(page.getByLabel(/Imię rodzica/)).toBeVisible();

  await page.getByLabel(/Imię rodzica/).fill("Anna");
  await page.getByLabel(/Nazwisko rodzica/).fill("Kowalska");
  await chooseBirthDate(page, "2000", 0, "15");

  await expect(page.getByLabel(/Imię rodzica/)).toHaveCount(0);
  await expect(page.getByLabel(/Nazwisko rodzica/)).toHaveCount(0);
});

test("clears a stale offering after the server rejects it", async ({ page }, testInfo) => {
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
  await fillAdultRegistration(page, e2eIdentitySuffix(testInfo));

  const offering = combobox(page, /Zajęcia/);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(offering).toContainText("Wybierz zajęcia");
  await expect(page.getByText("Wybrane zajęcia nie są już dostępne.").first()).toBeVisible();
});

test("reuses the same requestId after a temporary transport failure", async ({
  page,
}, testInfo) => {
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
  await fillAdultRegistration(page, e2eIdentitySuffix(testInfo));
  await page.waitForTimeout(850);

  const submit = page.getByRole("button", { name: "Wyślij zgłoszenie" });
  await submit.click();
  await expect(page.getByText("System jest chwilowo niedostępny. Spróbuj ponownie.")).toBeVisible();

  await submit.click();
  await expect(page.getByRole("heading", { name: "Dziękujemy, mamy zgłoszenie" })).toBeVisible();

  expect(requestIds).toHaveLength(2);
  expect(requestIds[0]).toBe(requestIds[1]);
});

test("starts another child with preserved contact data and a fresh requestId", async ({ page }) => {
  await mockSuccessfulRegistration(page);
  await openRegistrationForm(page);

  await chooseOption(page, /Miasto/, "Gdynia");
  await chooseOption(page, /Zajęcia/, "Contemporary");
  await page.getByLabel(/^Imię \*/).fill("Ola");
  await page.getByLabel(/^Nazwisko \*/).fill("Testowa");
  await chooseBirthDate(page, "2012", 0, "15");
  await page.getByLabel(/Imię rodzica/).fill("Anna");
  await page.getByLabel(/Nazwisko rodzica/).fill("Kowalska");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("anna@example.com");

  const firstRequestId = await page.locator('input[name="requestId"]').inputValue();
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await page.getByRole("button", { name: "Zapisz kolejne dziecko" }).click();

  await expect(combobox(page, /Miasto/)).toContainText("Gdynia");
  await expect(combobox(page, /Zajęcia/)).toContainText("Wybierz zajęcia");
  await expect(page.getByLabel(/^Imię \*/)).toHaveValue("");
  await expect(page.getByLabel(/^Nazwisko \*/)).toHaveValue("");
  await expect(page.getByLabel(/Numer telefonu/)).toHaveValue("500 000 000");
  await expect(page.getByLabel(/Adres e-mail/)).toHaveValue("anna@example.com");

  await chooseBirthDate(page, "2014", 0, "15");
  await expect(page.getByLabel(/Imię rodzica/)).toHaveValue("Anna");
  await expect(page.getByLabel(/Nazwisko rodzica/)).toHaveValue("Kowalska");

  const secondRequestId = await page.locator('input[name="requestId"]').inputValue();
  expect(secondRequestId).not.toBe(firstRequestId);
});

test("starts another activity with participant data preserved and a fresh requestId", async ({
  page,
}) => {
  await mockSuccessfulRegistration(page);
  await openRegistrationForm(page);
  await fillAdultRegistration(page, "Kolejne zajęcia");

  const firstRequestId = await page.locator('input[name="requestId"]').inputValue();
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await page.getByRole("button", { name: "Zgłoś inne zajęcia" }).click();

  await expect(combobox(page, /Miasto/)).toContainText("Gdynia");
  await expect(combobox(page, /Zajęcia/)).toContainText("Wybierz zajęcia");
  await expect(page.getByLabel(/^Imię \*/)).toHaveValue("Jan");
  await expect(page.getByLabel(/^Nazwisko \*/)).toHaveValue("Kowalski Kolejne zajęcia");
  await expect(page.getByLabel(/Numer telefonu/)).toHaveValue("500 000 000");
  await expect(page.getByLabel(/Adres e-mail/)).toHaveValue("jan@example.com");

  const secondRequestId = await page.locator('input[name="requestId"]').inputValue();
  expect(secondRequestId).not.toBe(firstRequestId);
});

test("keeps the main activity controls keyboard reachable", async ({ page }) => {
  await openRegistrationForm(page);
  await chooseOption(page, /Miasto/, "Gdynia");

  const city = combobox(page, /Miasto/);
  const offering = combobox(page, /Zajęcia/);
  await city.focus();
  await page.keyboard.press("Tab");
  await expect(offering).toBeFocused();
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

test("handles accidental honeypot autofill without focusing the hidden field", async ({
  page,
}, testInfo) => {
  await openRegistrationForm(page);
  await fillAdultRegistration(page, e2eIdentitySuffix(testInfo));

  const honeypot = page.locator('input[name="website"]');
  await honeypot.evaluate((input: HTMLInputElement) => {
    input.readOnly = false;
  });
  await honeypot.fill("https://autofill.example");

  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(page.locator("[data-validation-summary]")).toBeVisible();
  await expect(honeypot).not.toBeFocused();
});

test("keeps the form inside the viewport width", async ({ page }) => {
  await openRegistrationForm(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
