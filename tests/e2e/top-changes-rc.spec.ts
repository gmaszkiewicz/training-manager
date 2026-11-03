// Top progression 0.9 (the release candidate, and the default) on the production preview: the arrows around its
// Week/Month/Year/Years box step and stop at the ends and the choice survives a reload, and each circumference chart's
// filter is remembered on its own across a reload. Each test pins 0.9 and restores the defaults afterwards.
import { expect, test, type Locator, type Page } from "@playwright/test";

import { restoreDefaultComponents, saveComponents } from "./component-settings-helpers";
import { removeEntries, seedEntries } from "./measurement-seed-helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await saveComponents(page, { measurements: true, components: { "top-changes": "0.9" } });
});

test.afterEach(async ({ page }) => {
  await restoreDefaultComponents(page);
});

/** The Top progression tile itself, named by its title, so the Charts tile's controls above it are never matched. */
function topTile(page: Page): Locator {
  return page.getByRole("group", { name: "Top progression", exact: true });
}

/** The arrowed Week/Month/Year/Years box. */
function periodBox(page: Page): Locator {
  return topTile(page).getByRole("group", { name: "Chart period" });
}

function previousPeriod(page: Page): Locator {
  return periodBox(page).getByRole("button", { name: "Previous chart period", exact: true });
}

function nextPeriod(page: Page): Locator {
  return periodBox(page).getByRole("button", { name: "Next chart period", exact: true });
}

/** The box's own button, named by the chosen period. */
function chosenPeriod(page: Page, name: string): Locator {
  return periodBox(page).getByRole("button", { name, exact: true });
}

/** Clicks an arrow until the box names `expected`: a click before the island hydrates is dropped. */
async function step(page: Page, arrow: Locator, expected: string): Promise<void> {
  await expect(async () => {
    await arrow.click();
    await expect(chosenPeriod(page, expected)).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

/** Opens one circumference chart's filter menu, retrying until the island has hydrated. */
async function openFilter(page: Page, chart: "gain" | "loss"): Promise<void> {
  const trigger = topTile(page).getByRole("button", {
    name: `Filter circumferences: Top circumference ${chart}`,
    exact: true,
  });
  await expect(async () => {
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

async function closeFilter(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
}

function fieldItem(page: Page, name: string): Locator {
  return page.getByRole("menuitemcheckbox", { name, exact: true });
}

test("the period box arrows step, stop at the ends and the choice survives a reload", async ({ page }) => {
  await page.goto("/measurements");
  await expect(chosenPeriod(page, "Month")).toBeVisible();

  await step(page, previousPeriod(page), "Week");
  await expect(previousPeriod(page)).toBeDisabled();
  await expect(nextPeriod(page)).toBeEnabled();

  await step(page, nextPeriod(page), "Month");
  await step(page, nextPeriod(page), "Year");
  await step(page, nextPeriod(page), "Years");
  await expect(nextPeriod(page)).toBeDisabled();
  await expect(previousPeriod(page)).toBeEnabled();

  await page.reload();
  await expect(chosenPeriod(page, "Years")).toBeVisible();
  await expect(nextPeriod(page)).toBeDisabled();

  await step(page, previousPeriod(page), "Year");
  await page.reload();
  await expect(chosenPeriod(page, "Year")).toBeVisible();
});

test("each circumference filter is remembered on its own across a reload", async ({ page }) => {
  // The filters sit in the chart headers, which render only for a period with entries.
  const seeded = await seedEntries(page, 2, "e2e-top-changes-rc");
  try {
    await page.goto("/measurements");

    await openFilter(page, "gain");
    await expect(fieldItem(page, "Chest")).toBeChecked();
    await fieldItem(page, "Chest").click();
    await expect(fieldItem(page, "Chest")).not.toBeChecked();
    await closeFilter(page);

    // The loss chart keeps every field until its own filter changes.
    await openFilter(page, "loss");
    await expect(fieldItem(page, "Chest")).toBeChecked();
    await fieldItem(page, "Waist").click();
    await expect(fieldItem(page, "Waist")).not.toBeChecked();
    await closeFilter(page);

    await page.reload();
    await openFilter(page, "gain");
    await expect(fieldItem(page, "Chest")).not.toBeChecked();
    await expect(fieldItem(page, "Waist")).toBeChecked();
    await closeFilter(page);

    await openFilter(page, "loss");
    await expect(fieldItem(page, "Chest")).toBeChecked();
    await expect(fieldItem(page, "Waist")).not.toBeChecked();
    await closeFilter(page);
  } finally {
    await removeEntries(page, seeded);
  }
});
