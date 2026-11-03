// Settings → Components on the production preview: the defaults on the screen, the Top progression release candidate
// with its yellow RC badge and tooltip, its v0.1 preview with the red Preview badge and the 0.1 layout, a component switched off hiding its tile, every component off showing the empty-state card, and
// the Measurements module off removing the menu link and sending /measurements to Hub. Every test restores the
// defaults, since the specs share the one throwaway trainee.
import { expect, test, type Locator, type Page } from "@playwright/test";

import { restoreDefaultComponents, saveComponents, TRAINEE_COMPONENTS_OFF } from "./component-settings-helpers";
import { removeEntries, seedEntries } from "./measurement-seed-helpers";

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ page }) => {
  await restoreDefaultComponents(page);
});

function versionSelect(page: Page, label: string): Locator {
  return page.getByRole("combobox", { name: label, exact: true });
}

function measurementsSwitch(page: Page): Locator {
  return page.getByRole("switch", { name: "Measurements", exact: true });
}

/** The Top progression tile, named by its title. */
function topTile(page: Page): Locator {
  return page.getByRole("group", { name: "Top progression", exact: true });
}

/** The line Charts tile, named by its title. */
function chartsTile(page: Page): Locator {
  return page.getByRole("group", { name: /^(Weekly|Monthly|Year) progression$|^Selected entries \(\d+\)$/ });
}

/** The menu's Measurements link (desktop bar; the phone Menu renders its items only while open). */
function measurementsLink(page: Page): Locator {
  return page.locator('a[href="/measurements"]');
}

/** Saves the form and waits for the toast: a click before the island hydrates posts without JavaScript. */
async function save(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/components\?notice=components-saved$/);
  await expect(page.getByText("Components saved", { exact: true })).toBeVisible();
}

/** Chooses an option in a version select, retrying until the island has hydrated. */
async function choose(page: Page, label: string, option: string): Promise<void> {
  const select = versionSelect(page, label);
  await expect(async () => {
    await select.click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 1_000 });
    await expect(select).toHaveText(option, { timeout: 1_000 });
  }).toPass();
}

test("the screen shows the trainee's defaults", async ({ page }) => {
  await page.goto("/settings/components");

  await expect(measurementsSwitch(page)).toBeChecked();
  await expect(versionSelect(page, "New measurement")).toHaveText("v1.0");
  await expect(versionSelect(page, "Edit measurement")).toHaveText("v1.0");
  await expect(versionSelect(page, "Your measurements")).toHaveText("v1.0");
  await expect(versionSelect(page, "Progression")).toHaveText("v1.0");
  await expect(versionSelect(page, "Top progression")).toHaveText("v0.9 (RC)");
  // Only the trainee's rows.
  await expect(versionSelect(page, "Find trainee")).toHaveCount(0);
  await expect(versionSelect(page, "Choose trainee")).toHaveCount(0);
  await expect(versionSelect(page, "Measurements")).toHaveCount(0);
  for (const locked of ["Nutrition", "Training", "Planning"]) {
    const lockedSwitch = page.getByRole("switch", { name: locked, exact: true });
    await expect(lockedSwitch).toBeDisabled();
    await expect(lockedSwitch).not.toBeChecked();
  }
});

/** A version badge in a tile's card: it sits outside the tile's <details>, so it is found through the card. */
function badge(page: Page, tileId: string, name: "RC" | "Preview"): Locator {
  return page.locator(`[data-tile-card="${tileId}"]`).getByRole("button", { name, exact: true });
}

test("Top progression shows the 0.9 release candidate by default with the yellow RC badge", async ({ page }) => {
  await page.goto("/measurements");
  const rc = badge(page, "top-changes", "RC");
  const periods = topTile(page).getByRole("group", { name: "Chart period" });
  await expect(rc).toBeVisible();
  await expect(rc).toHaveAttribute("data-rc-badge", "");
  await expect(rc).toHaveAttribute("data-preview-badge");
  await expect(rc).toHaveAttribute("data-variant", "warning");
  await expect(badge(page, "top-changes", "Preview")).toHaveCount(0);
  // 0.9's period box: Week/Month/Year/Years between arrows, not 0.1's row of buttons.
  await expect(periods.getByRole("button", { name: "Previous chart period", exact: true })).toBeVisible();
  // The line charts are stable: no badge.
  await expect(badge(page, "charts", "RC")).toHaveCount(0);
  await expect(badge(page, "charts", "Preview")).toHaveCount(0);

  const tooltip = page.getByRole("tooltip");
  await expect(async () => {
    await rc.hover();
    await expect(tooltip).toHaveText("Release candidate - it may contain bugs", { timeout: 1_000 });
  }).toPass();

  // Keyboard focus alone opens it too: a fresh load has no hover.
  await page.reload();
  await expect(tooltip).toHaveCount(0);
  await expect(async () => {
    await rc.blur();
    await rc.focus();
    await expect(tooltip).toHaveText("Release candidate - it may contain bugs", { timeout: 1_000 });
  }).toPass();

  // A click on the badge does not collapse the tile.
  await rc.click();
  await expect(periods).toBeVisible();
});

test("choosing v0.1 shows the red Preview badge and the 0.1 layout", async ({ page }) => {
  await page.goto("/settings/components");
  await choose(page, "Top progression", "v0.1 (preview)");
  await save(page);

  await page.goto("/measurements");
  const preview = badge(page, "top-changes", "Preview");
  const periods = topTile(page).getByRole("group", { name: "Chart period" });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-variant", "destructive");
  await expect(preview).not.toHaveAttribute("data-rc-badge");
  await expect(badge(page, "top-changes", "RC")).toHaveCount(0);
  // 0.1's row of period buttons, without 0.9's arrowed box.
  await expect(periods.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
    "aria-pressed",
    /true|false/,
  );
  await expect(periods.getByRole("button", { name: "Previous chart period", exact: true })).toHaveCount(0);

  const tooltip = page.getByRole("tooltip");
  await expect(async () => {
    await preview.hover();
    await expect(tooltip).toHaveText("Preview version — it may contain bugs.", { timeout: 1_000 });
  }).toPass();

  // A click on the badge does not collapse the tile.
  await preview.click();
  await expect(periods).toBeVisible();
});

test("Progression off hides the Charts tile", async ({ page }) => {
  await saveComponents(page, { components: { progression: "off" } });
  // Visualize shows only under a non-empty list, so the test brings its own entry.
  const seeded = await seedEntries(page, 1, "e2e-settings");
  try {
    await page.goto("/measurements");
    await expect(page.getByRole("group", { name: "Your measurements", exact: true })).toBeVisible();
    await expect(chartsTile(page)).toHaveCount(0);

    // Visualize stays under the list, disabled, and says why on hover.
    const visualize = page.getByRole("button", { name: "Visualize", exact: true });
    await expect(visualize).toHaveAttribute("aria-disabled", "true");
    await expect(async () => {
      await visualize.hover();
      await expect(page.getByRole("tooltip")).toHaveText("The Progression component is off.", { timeout: 1_000 });
    }).toPass();
  } finally {
    await removeEntries(page, seeded);
  }
});

test("every component off shows the empty-state card linking to Settings → Components", async ({ page }) => {
  await saveComponents(page, { components: TRAINEE_COMPONENTS_OFF });

  await page.goto("/measurements");
  await expect(page.getByRole("heading", { name: "Every Measurements component is off", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "New measurement", exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Your measurements", exact: true })).toHaveCount(0);
  await expect(chartsTile(page)).toHaveCount(0);

  await page.getByRole("link", { name: "Settings → Components", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/components$/);
});

test("the Measurements module off removes the menu link and sends /measurements to Hub", async ({ page }) => {
  await saveComponents(page, { measurements: false });

  await page.goto("/measurements");
  await expect(page).toHaveURL(/\/hub\/collaborations$/);
  await expect(measurementsLink(page)).toHaveCount(0);

  // Switching it back on restores the link and the page.
  await page.goto("/settings/components");
  const moduleSwitch = measurementsSwitch(page);
  await expect(moduleSwitch).not.toBeChecked();
  await expect(async () => {
    await moduleSwitch.click();
    await expect(moduleSwitch).toBeChecked({ timeout: 1_000 });
  }).toPass();
  await save(page);
  await expect(measurementsLink(page)).toBeVisible();

  await page.goto("/measurements");
  await expect(page).toHaveURL(/\/measurements$/);
  await expect(page.getByRole("group", { name: "New measurement", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Your measurements", exact: true })).toBeVisible();
  await expect(chartsTile(page)).toBeVisible();
});
