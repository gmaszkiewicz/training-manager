// Provenance: auth-gate-redirect — a signed-out visit to the journal is sent to sign-in.
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("signed-out visit to measurements is sent to sign-in", async ({ page }) => {
  await page.goto("/measurements");

  await expect(page).toHaveURL(/\/auth\/signin\/?$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  // The gate creates no data, so there is nothing to clean up.
});
