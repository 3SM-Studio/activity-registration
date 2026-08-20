import { expect, test } from "@playwright/test";

test("prevents leading and repeated whitespace in participant names", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const firstName = page.getByLabel(/^Imię \*/);
  const lastName = page.getByLabel(/^Nazwisko \*/);

  await firstName.fill("   Anna   Maria");
  await lastName.fill("   van   der   Meer");

  await expect(firstName).toHaveValue("Anna Maria");
  await expect(lastName).toHaveValue("van der Meer");
});

test("does not allow whitespace in the email input", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const email = page.getByLabel(/Adres e-mail/);
  await email.fill(" jan @ example.com ");

  await expect(email).toHaveValue("jan@example.com");
});
