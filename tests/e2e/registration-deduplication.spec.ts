import { expect, test, type Page } from "@playwright/test";

function combobox(page: Page, name: RegExp) {
  return page.getByRole("combobox", { name });
}

async function chooseOption(page: Page, fieldName: RegExp, optionName: string) {
  const trigger = combobox(page, fieldName);
  await trigger.click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

async function chooseBirthDate(page: Page, year: string, monthIndex: number, day: string) {
  await page.getByRole("button", { name: /Data urodzenia/ }).click();
  const calendar = page.locator('[data-slot="calendar"]');
  const dropdowns = calendar.locator("select");
  await dropdowns.nth(1).selectOption({ label: year });
  await dropdowns.nth(0).selectOption({ index: monthIndex });
  await calendar
    .locator("button[data-day]")
    .filter({ hasText: new RegExp(`^${day}$`) })
    .click();
}

async function fillAdultRegistration(page: Page) {
  await chooseOption(page, /Miasto/, "Gdynia");
  await chooseOption(page, /Zajęcia/, "Hip-hop");
  await page.getByLabel(/^Imię \*/).fill("Jan");
  await page.getByLabel(/^Nazwisko \*/).fill("Kowalski");
  await chooseBirthDate(page, "2000", 0, "15");
  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("jan@example.com");
}

test("shows a safe success state for an exact business duplicate", async ({ page }) => {
  let submittedRequestId: string | null = null;

  await page.route("**/api/registrations", async (route) => {
    const body = route.request().postDataJSON() as { requestId?: unknown };
    submittedRequestId = typeof body.requestId === "string" ? body.requestId : null;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        registrationId: "reg_11111111-1111-4111-8111-111111111111",
        duplicate: true,
      }),
    });
  });

  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await fillAdultRegistration(page);
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();

  await expect(
    page.getByRole("heading", { name: "Takie zgłoszenie jest już w systemie" }),
  ).toBeVisible();
  await expect(page.getByText("Nie musisz wysyłać go ponownie.")).toBeVisible();
  await expect(
    page.getByText(/status zgłoszenia|przypisana grupa|dane opiekuna|notatki/i),
  ).toHaveCount(0);
  expect(submittedRequestId).toMatch(/^[0-9a-f-]{36}$/i);
});
