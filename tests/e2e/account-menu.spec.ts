// Avatar account menu in the top bar: Profile, Settings, Sign out at desktop width and at 360×800.
import { expect, test, type Page } from "@playwright/test";

const widths = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "360×800", viewport: { width: 360, height: 800 } },
];

async function openAccountMenu(page: Page): Promise<void> {
  const account = page.getByRole("button", { name: "Account menu" });
  await expect(account).toBeVisible();
  // A click before the island hydrates opens nothing. Retry until the menu shows.
  await expect(async () => {
    await account.click();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
}

for (const { name, viewport } of widths) {
  test.describe(`account menu at ${name}`, () => {
    test.use({ viewport });

    test("Profile opens the Details tab and Settings opens the Change password tab", async ({ page }) => {
      await page.goto("/");
      await openAccountMenu(page);
      await page.getByRole("menuitem", { name: "Profile" }).click();
      await expect(page).toHaveURL(/\/profile\/?$/);
      await expect(page.getByRole("tab", { name: "Details", selected: true })).toBeVisible();

      await openAccountMenu(page);
      await expect(page.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("aria-current", "page");
      await page.getByRole("menuitem", { name: "Settings" }).click();
      await expect(page).toHaveURL(/\/settings\/?$/);
      await expect(page.getByRole("tab", { name: "Change password", selected: true })).toBeVisible();

      await openAccountMenu(page);
      await expect(page.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    });

    test.describe("sign out", () => {
      // A fresh, signed-out context with its own throwaway trainee: signing out here
      // must not end the shared E2E user's stored session used by the other specs.
      test.use({ storageState: { cookies: [], origins: [] } });

      test("Sign out lands on / with the guest bar", async ({ page }) => {
        const email = `e2e-signout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
        const response = await page.request.post("/api/auth/signup", {
          form: { email, password: "E2e-Signout-Passw0rd!", role: "trainee" },
        });
        expect(response.ok(), `signup failed: ${response.status()}`).toBeTruthy();
        test.skip(
          !new URL(response.url()).pathname.startsWith("/measurements"),
          "Sign-up needs email confirmation on this Supabase; the sign-out check needs a signed-in throwaway user.",
        );

        await page.goto("/");
        await openAccountMenu(page);
        await page.getByRole("menuitem", { name: "Sign out" }).click();

        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText("Hello, guest")).toBeVisible();
        await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
      });
    });
  });
}
