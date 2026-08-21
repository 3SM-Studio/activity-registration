import { expect, test } from "@playwright/test";

test("locks page scroll while the birth date calendar is open", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const trigger = page.getByRole("button", { name: /Data urodzenia/ });
  await trigger.scrollIntoViewIfNeeded();

  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  expect(scrollBeforeOpen).toBeGreaterThan(0);

  await trigger.click();

  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover).toBeVisible();

  const lockedScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(4, 4);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(150);

  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScrollY);

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();

  const unlockedScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(4, 4);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);

  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(unlockedScrollY);
});
