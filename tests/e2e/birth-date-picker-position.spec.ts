import { expect, test } from "@playwright/test";

test("keeps the birth date popover rigidly anchored while the page scrolls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const trigger = page.getByRole("button", { name: /Data urodzenia/ });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover).toBeVisible();
  await expect(popover).toHaveAttribute("data-side", "bottom");

  const initialTriggerBox = await trigger.boundingBox();
  const initialPopoverBox = await popover.boundingBox();

  expect(initialTriggerBox).not.toBeNull();
  expect(initialPopoverBox).not.toBeNull();

  if (!initialTriggerBox || !initialPopoverBox) {
    throw new Error("Could not measure the birth date trigger and popover.");
  }

  const initialGap = initialPopoverBox.y - (initialTriggerBox.y + initialTriggerBox.height);
  expect(initialGap).toBeGreaterThanOrEqual(7);
  expect(initialGap).toBeLessThanOrEqual(9.5);

  await page.evaluate(() => window.scrollBy(0, 80));

  await expect
    .poll(async () => {
      const triggerBox = await trigger.boundingBox();
      const popoverBox = await popover.boundingBox();

      if (!triggerBox || !popoverBox) {
        return Number.POSITIVE_INFINITY;
      }

      const currentGap = popoverBox.y - (triggerBox.y + triggerBox.height);
      return Math.abs(currentGap - initialGap);
    })
    .toBeLessThan(1.5);

  await expect(popover).toHaveAttribute("data-side", "bottom");
});
