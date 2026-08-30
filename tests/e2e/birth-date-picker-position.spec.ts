import { expect, test } from "@playwright/test";

test("locks page scroll while the birth date calendar is open", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const trigger = page.getByRole("button", { name: /Data urodzenia/ });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");

  if (!testInfo.project.use.isMobile) {
    const lockedState = await page.evaluate(() => ({
      scrollY: window.scrollY,
      maxScrollY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    }));
    const wheelDelta = lockedState.scrollY < lockedState.maxScrollY - 50 ? 300 : -300;

    await page.mouse.move(4, 4);
    await page.mouse.wheel(0, wheelDelta);
    await page.waitForTimeout(150);

    expect(await page.evaluate(() => window.scrollY)).toBe(lockedState.scrollY);
  }

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked", "1");

  if (!testInfo.project.use.isMobile) {
    const unlockedState = await page.evaluate(() => ({
      scrollY: window.scrollY,
      maxScrollY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    }));
    const wheelDelta = unlockedState.scrollY < unlockedState.maxScrollY - 50 ? 300 : -300;

    await page.mouse.move(4, 4);
    await page.mouse.wheel(0, wheelDelta);
    await page.waitForTimeout(150);

    expect(await page.evaluate(() => window.scrollY)).not.toBe(unlockedState.scrollY);
  }
});
