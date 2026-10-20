// Phone-width menus on /measurements: one click opens hamburger Sign out and row Edit/Delete.
import { expect, test, type Page } from "@playwright/test";

test.describe("360×800 menus", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("one click opens Menu with Sign out and row Actions with Edit and Delete", async ({ page }) => {
    await ensureMeasurementRow(page);
    await page.goto("/measurements");

    const menu = page.getByRole("button", { name: "Menu", exact: true });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toHaveCount(0);

    const actions = page.getByRole("button", { name: /^Actions for measurement from / }).first();
    await expect(actions).toBeVisible();
    await actions.click();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  });
});

async function ensureMeasurementRow(page: Page): Promise<void> {
  await page.goto("/measurements");
  if ((await page.getByRole("button", { name: /^Actions for measurement from / }).count()) > 0) {
    return;
  }

  // Seed into the current UTC month so the default journal page shows the row.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(Math.min(now.getUTCDate(), 28)).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const measuredOn = `${y}-${m}-${d}T${hh}:${mm}`;
  const response = await page.request.post("/api/measurements", {
    form: {
      measured_on: measuredOn,
      utc_offset_minutes: "0",
      weight_kg: "80.0",
      chest_cm: "50.0",
      waist_cm: "50.0",
      arms_cm: "50.0",
      thigh_cm: "50.0",
      calf_cm: "50.0",
      hips_cm: "50.0",
      navel_cm: "50.0",
      note: `e2e-phone-menus-${now.getTime()}`,
    },
    headers: { Accept: "application/json" },
  });
  expect(response.ok(), `seed measurement failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}
