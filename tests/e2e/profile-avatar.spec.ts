// Avatar tab: an uploaded image reaches the top-bar account button, and Remove brings the initials back.
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const FIXTURE = fileURLToPath(new URL("./fixtures/avatar.png", import.meta.url));

async function openAccountMenu(page: Page): Promise<void> {
  const account = page.getByRole("button", { name: "Account menu" });
  await expect(account).toBeVisible();
  // A click before the island hydrates opens nothing. Retry until the menu shows.
  await expect(async () => {
    await account.click();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

async function removeAvatar(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your avatar was removed.")).toBeVisible();
}

test("an uploaded avatar shows in the top bar and Remove restores the initials", async ({ page }) => {
  // The first /measurements visit creates the profile row a fresh trainee needs.
  await page.goto("/measurements");
  const account = page.getByRole("button", { name: "Account menu" });
  const initials = account.locator('[data-slot="avatar-fallback"]');

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile\/?$/);
  await page.getByRole("tab", { name: "Avatar" }).click();
  await expect(page).toHaveURL(/\/profile\/avatar\/?$/);
  await expect(page.getByRole("tab", { name: "Avatar", selected: true })).toBeVisible();

  // A run that failed before cleanup may have left an avatar behind.
  if (await page.getByRole("button", { name: "Remove" }).isVisible()) {
    await removeAvatar(page);
  }

  await openAccountMenu(page);
  await expect(page.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");

  await page.getByLabel("Image").setInputFiles(FIXTURE);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Your avatar was saved.")).toBeVisible();
  await expect(account.locator("img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/avatars\//);

  await removeAvatar(page);
  await expect(account.locator("img")).toHaveCount(0);
  await expect(initials).toBeVisible();
  await expect(initials).not.toBeEmpty();
});
