// Theme switch in the top bar: the choice persists and the head script applies it before hydration, signed in and as a guest.
import { expect, test, type Page } from "@playwright/test";

const contexts = [
  { name: "signed in", storageState: undefined },
  { name: "guest", storageState: { cookies: [], origins: [] } },
];

async function openThemeMenu(page: Page): Promise<void> {
  const theme = page.getByRole("button", { name: "Theme" });
  await expect(theme).toBeVisible();
  // A click before the island hydrates opens nothing. Retry until the menu shows.
  await expect(async () => {
    await theme.click();
    await expect(page.getByRole("menuitemradio", { name: "Dark" })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(page.getByRole("menuitemradio", { name: "Light" })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "System" })).toBeVisible();
}

async function pickTheme(page: Page, name: "Light" | "Dark" | "System"): Promise<void> {
  await openThemeMenu(page);
  await page.getByRole("menuitemradio", { name }).click();
}

const islandScripts = "**/_astro/*.js";

// Loads with every bundled script aborted, so no island hydrates and only the inline head script can set the class.
async function hasDarkClassWithoutIslands(page: Page, load: () => Promise<unknown>): Promise<boolean> {
  await page.route(islandScripts, (route) => route.abort());
  await load();
  const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.unroute(islandScripts);
  return dark;
}

for (const { name, storageState } of contexts) {
  test.describe(`theme switch ${name}`, () => {
    if (storageState) {
      test.use({ storageState });
    }

    test.describe("with a light system theme", () => {
      test.use({ colorScheme: "light" });

      test("Dark persists across a reload before hydration, and Light removes it", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("html")).not.toContainClass("dark");

        await pickTheme(page, "Dark");
        await expect(page.locator("html")).toContainClass("dark");

        expect(await hasDarkClassWithoutIslands(page, () => page.reload())).toBe(true);

        await page.reload();
        await pickTheme(page, "Light");
        await expect(page.locator("html")).not.toContainClass("dark");

        expect(await hasDarkClassWithoutIslands(page, () => page.reload())).toBe(false);
      });
    });

    test.describe("with a dark system theme", () => {
      test.use({ colorScheme: "dark" });

      test("a fresh load with no stored choice is dark before hydration", async ({ page }) => {
        expect(await hasDarkClassWithoutIslands(page, () => page.goto("/"))).toBe(true);
      });
    });
  });
}
