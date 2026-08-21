import { expect, test } from "@playwright/test";

test("publishes adopted full and child-friendly protection standards v1.1", async ({ page }) => {
  await page.goto("/standardy-ochrony-maloletnich");
  await expect(
    page.getByRole("heading", { level: 1, name: "Standardy Ochrony Małoletnich" }),
  ).toBeVisible();
  await expect(page.getByText(/Wersja 1\.1 · przyjęta i obowiązująca od 21 sierpnia 2026 r\./)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "5. Dzieci z niepełnosprawnościami i specjalnymi potrzebami edukacyjnymi",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "16. Udostępnianie Standardów" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Zasady bezpieczeństwa dla dzieci i młodzieży" }),
  ).toBeVisible();

  await page.goto("/standardy-ochrony-maloletnich/dla-dzieci");
  await expect(
    page.getByRole("heading", { level: 1, name: "Zasady bezpieczeństwa dla dzieci i młodzieży" }),
  ).toBeVisible();
  await expect(page.getByText(/Wersja 1\.1 · skrócona wersja Standardów Ochrony Małoletnich/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Twoje potrzeby mają znaczenie" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Gdy ktoś robi Ci krzywdę" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "pozytywka.boleslaw@gmail.com" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pełne Standardy Ochrony Małoletnich" }),
  ).toBeVisible();
});

test("marks custom required controls programmatically", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("group", { name: "Zajęcia" })).toBeVisible();
  await expect(page.getByText("Pola oznaczone * są wymagane.", { exact: true })).toBeVisible();

  const city = page.getByRole("combobox", { name: /Miasto/ });
  const offering = page.getByRole("combobox", { name: /^Zajęcia/ });
  const birthDate = page.getByRole("button", { name: /Data urodzenia|Wybierz datę urodzenia/ });

  await expect(city).toHaveAttribute("aria-required", "true");
  await expect(offering).toHaveAttribute("aria-required", "true");
  await expect(birthDate).toHaveAttribute("aria-required", "true");
});

test("keeps public safety navigation available from the form", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Informacje i bezpieczeństwo" });
  await expect(navigation.getByRole("link", { name: "Polityka prywatności" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Standardy ochrony małoletnich" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Zasady dla dzieci i młodzieży" }),
  ).toBeVisible();
});
