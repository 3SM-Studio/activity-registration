import { expect, test, type Page } from "@playwright/test";

// Regression coverage for the narrow mobile layout used by the public registration form.
async function expectNoHorizontalOverflow(page: Page) {
  const pageMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(pageMetrics.clientWidth);

  const controls = page.locator(
    '[data-slot="select-trigger"], .pozytywka-phone-input, .pozytywka-phone-input .PhoneInputInput, input[type="email"]',
  );
  const count = await controls.count();

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible())) {
      continue;
    }

    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      continue;
    }

    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(pageMetrics.clientWidth + 1);
  }
}

async function expectPhoneCountryDropdownInsideField(page: Page) {
  const phoneShell = page.locator(".pozytywka-phone-input");
  const countryTrigger = page.getByRole("combobox", { name: "Kraj numeru telefonu" });

  await countryTrigger.click();

  const dropdown = page.locator('[data-slot="select-content"]').filter({ hasText: "Polska" });
  await expect(dropdown).toBeVisible();

  const [shellBox, dropdownBox] = await Promise.all([phoneShell.boundingBox(), dropdown.boundingBox()]);
  expect(shellBox).not.toBeNull();
  expect(dropdownBox).not.toBeNull();

  if (!shellBox || !dropdownBox) {
    return;
  }

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);

  expect(dropdownBox.x).toBeGreaterThanOrEqual(-1);
  expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  expect(dropdownBox.x).toBeGreaterThanOrEqual(shellBox.x - 1);
  expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width + 1);

  await page.keyboard.press("Escape");
}

test("keeps selects and contact fields inside narrow mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chromium", "Mobile regression coverage only.");

  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const city = page.getByRole("combobox", { name: /Miasto/ });
  await city.click();
  await page.getByRole("option", { name: "Gdynia", exact: true }).click();

  const offering = page.getByRole("combobox", { name: /Zajęcia/ });
  await offering.click();
  await page.getByRole("option", { name: "Taniec współczesny", exact: true }).click();

  await page.getByLabel(/Numer telefonu/).fill("500 000 000");
  await page.getByLabel(/Adres e-mail/).fill("mobilny@example.com");

  await expectNoHorizontalOverflow(page);
});

test("keeps phone country dropdown inside the phone field at 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await expectPhoneCountryDropdownInsideField(page);
  await expectNoHorizontalOverflow(page);
});
