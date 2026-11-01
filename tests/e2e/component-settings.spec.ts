// Settings → Components on the production preview: the defaults on the screen, the Top progression preview with its
// badge and tooltip, a component switched off hiding its tile, every component off showing the empty-state card, and
// the Measurements module off removing the menu link and sending /measurements to Hub. Every test restores the
// defaults, since the specs share the one throwaway trainee.
import { expect, test, type Locator, type Page } from "@playwright/test";

import { restoreDefaultComponents, saveComponents, TRAINEE_COMPONENTS_OFF } from "./component-settings-helpers";

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
  await expect(versionSelect(page, "Top progression")).toHaveText("Off");
  // Only the trainee's rows.
  await expect(versionSelect(page, "Find trainee")).toHaveCount(0);
  await expect(versionSelect(page, "Choose trainee")).toHaveCount(0);
  await expect(versionSelect(page, "Measurements for")).toHaveCount(0);
  for (const locked of ["Nutrition", "Training", "Planning"]) {
    const lockedSwitch = page.getByRole("switch", { name: locked, exact: true });
    await expect(lockedSwitch).toBeDisabled();
    await expect(lockedSwitch).not.toBeChecked();
  }
});

test("Top progression is hidden by default and its preview carries the badge", async ({ page }) => {
  await page.goto("/measurements");
  await expect(chartsTile(page)).toBeVisible();
  await expect(topTile(page)).toHaveCount(0);

  await page.goto("/settings/components");
  await choose(page, "Top progression", "v0.1 (preview)");
  await save(page);

  await page.goto("/measurements");
  // The badge sits in the tile's card, outside its <details>, so it is found through the card.
  const badge = page.locator('[data-tile-card="top-changes"]').getByRole("button", { name: "Preview", exact: true });
  const periods = topTile(page).getByRole("group", { name: "Chart period" });
  await expect(badge).toBeVisible();
  await expect(periods).toBeVisible();
  // The line charts are not a preview.
  await expect(
    page.locator('[data-tile-card="charts"]').getByRole("button", { name: "Preview", exact: true }),
  ).toHaveCount(0);

  const tooltip = page.getByRole("tooltip");
  await expect(async () => {
    await badge.hover();
    await expect(tooltip).toHaveText("Preview version — it may contain bugs.", { timeout: 1_000 });
  }).toPass();

  // Keyboard focus alone opens it too: a fresh load has no hover.
  await page.reload();
  await expect(tooltip).toHaveCount(0);
  await expect(async () => {
    await badge.blur();
    await badge.focus();
    await expect(tooltip).toHaveText("Preview version — it may contain bugs.", { timeout: 1_000 });
  }).toPass();

  // A click on the badge does not collapse the tile.
  await badge.click();
  await expect(periods).toBeVisible();
});

test("Progression off hides the Charts tile", async ({ page }) => {
  await saveComponents(page, { components: { progression: "off" } });

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
