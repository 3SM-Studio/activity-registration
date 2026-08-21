import { expect, test } from "@playwright/test";

test("keeps the birth date calendar physically anchored to its field during scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const trigger = page.getByRole("button", { name: /Data urodzenia/ });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const calendar = page.locator('[data-slot="birth-date-calendar"]');

  await expect(calendar).toBeVisible();
  await expect(calendar).toHaveCSS("position", "absolute");
  await expect(calendar).toHaveAttribute("data-placement", /^(top|bottom)$/);

  expect(
    await calendar.evaluate((node) => node.parentElement?.getAttribute("data-slot") ?? null),
  ).toBe("birth-date-picker");

  const result = await page.evaluate(() => {
    const pickerNode = document.querySelector<HTMLElement>('[data-slot="birth-date-picker"]');
    const triggerNode = pickerNode?.querySelector<HTMLElement>("button");
    const calendarNode = pickerNode?.querySelector<HTMLElement>(
      '[data-slot="birth-date-calendar"]',
    );

    if (!pickerNode || !triggerNode || !calendarNode) {
      throw new Error("Could not find the birth date picker geometry nodes.");
    }

    const placement = calendarNode.dataset.placement;
    const initialTriggerRect = triggerNode.getBoundingClientRect();
    const initialCalendarRect = calendarNode.getBoundingClientRect();
    const initialGap =
      placement === "top"
        ? initialTriggerRect.top - initialCalendarRect.bottom
        : initialCalendarRect.top - initialTriggerRect.bottom;

    let maximumFrameDrift = 0;

    for (let index = 0; index < 8; index += 1) {
      const beforeTriggerTop = triggerNode.getBoundingClientRect().top;
      const beforeCalendarTop = calendarNode.getBoundingClientRect().top;

      window.scrollBy(0, 12);

      const triggerDelta = triggerNode.getBoundingClientRect().top - beforeTriggerTop;
      const calendarDelta = calendarNode.getBoundingClientRect().top - beforeCalendarTop;
      maximumFrameDrift = Math.max(maximumFrameDrift, Math.abs(triggerDelta - calendarDelta));
    }

    const finalTriggerRect = triggerNode.getBoundingClientRect();
    const finalCalendarRect = calendarNode.getBoundingClientRect();
    const finalGap =
      placement === "top"
        ? finalTriggerRect.top - finalCalendarRect.bottom
        : finalCalendarRect.top - finalTriggerRect.bottom;

    return {
      initialGap,
      finalGap,
      maximumFrameDrift,
    };
  });

  expect(result.initialGap).toBeGreaterThanOrEqual(7);
  expect(result.initialGap).toBeLessThanOrEqual(9);
  expect(result.finalGap).toBeGreaterThanOrEqual(7);
  expect(result.finalGap).toBeLessThanOrEqual(9);
  expect(result.maximumFrameDrift).toBeLessThan(0.5);

  await expect(calendar).toBeVisible();

  await page.mouse.click(4, 4);
  await expect(calendar).toBeHidden();
});
