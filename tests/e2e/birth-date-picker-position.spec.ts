import { expect, test } from "@playwright/test";

async function expectPopoverSeparatedFromTrigger(
  trigger: ReturnType<Parameters<typeof test>[1]> extends never ? never : never,
) {
  void trigger;
}

test("keeps the birth date popover separated from its trigger without position animation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const trigger = page.getByRole("button", { name: /Data urodzenia/ });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("animation-name", "none");

  const measureSeparation = async () => {
    const triggerBox = await trigger.boundingBox();
    const popoverBox = await popover.boundingBox();

    if (!triggerBox || !popoverBox) {
      throw new Error("Could not measure the birth date trigger and popover.");
    }

    const gapBelow = popoverBox.y - (triggerBox.y + triggerBox.height);
    const gapAbove = triggerBox.y - (popoverBox.y + popoverBox.height);
    return Math.max(gapBelow, gapAbove);
  };

  expect(await measureSeparation()).toBeGreaterThanOrEqual(7);

  await page.evaluate(() => window.scrollBy(0, 80));

  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("animation-name", "none");
  expect(await measureSeparation()).toBeGreaterThanOrEqual(7);
});
