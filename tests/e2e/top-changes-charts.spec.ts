// The Top progression tile on the production preview: it renders the seeded radar charts, its period controls change the
// window and survive a reload, its circumference filter survives a reload, and its closed state survives a reload.
import { expect, test, type Locator, type Page } from "@playwright/test";

const chartTitles = ["Top weight gain", "Top circumference gain", "Top weight loss", "Top circumference loss"];

/** The Top progression tile itself, named by its title, so the Charts tile's controls above it are never matched. */
function topTile(page: Page): Locator {
  return page.getByRole("group", { name: "Top progression", exact: true });
}

/** The line Charts tile above it, named by its title. */
function chartsTile(page: Page): Locator {
  return page.getByRole("group", { name: /^(Weekly|Monthly|Year) progression$/ });
}

// Chromium exposes a <summary> as text inside the details group, not as a button, so the heading is found by text.
function topSummary(page: Page): Locator {
  return topTile(page).getByText("Top progression", { exact: true });
}

function periodButton(page: Page, name: string): Locator {
  return topTile(page).getByRole("group", { name: "Chart period" }).getByRole("button", { name, exact: true });
}

/** Clicks until the button is pressed: a click before the island hydrates is dropped. */
async function press(button: Locator): Promise<void> {
  await expect(async () => {
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
  }).toPass();
}

/** Opens the "Circumferences" menu, retrying until the island has hydrated. */
async function openFilter(page: Page): Promise<void> {
  const trigger = topTile(page).getByRole("button", { name: "Circumferences", exact: true });
  await expect(async () => {
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DDTHH:mm` in UTC, the form the add endpoint takes with a zero offset. */
function minuteValue(at: Date): string {
  return `${String(at.getUTCFullYear())}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}T${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`;
}

/**
 * Seeds `count` entries a few minutes in the past, in the current UTC month so the default chart month shows them. The
 * newest is the lightest, so the window always holds a weight loss.
 */
async function seedEntries(page: Page, count: number): Promise<string[]> {
  // Right after a UTC month starts there are not enough past minutes in it yet: wait until there are.
  const started = new Date();
  const monthStart = Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), 1);
  const wait = (count + 1) * 60_000 - (started.getTime() - monthStart);
  if (wait > 0) {
    test.setTimeout(test.info().timeout + wait);
    await page.waitForTimeout(wait);
  }
  const now = new Date();
  const seeded: string[] = [];
  for (let minutesAgo = 1; seeded.length < count && minutesAgo < 120; minutesAgo += 1) {
    const at = new Date(now.getTime() - minutesAgo * 60_000);
    if (at.getUTCMonth() !== now.getUTCMonth()) {
      break;
    }
    const measuredOn = minuteValue(at);
    const weight = (70 + seeded.length).toFixed(1);
    const response = await page.request.post("/api/measurements", {
      form: {
        measured_on: measuredOn,
        utc_offset_minutes: "0",
        weight_kg: weight,
        chest_cm: "90.0",
        waist_cm: "80.0",
        arms_cm: "30.0",
        thigh_cm: "55.0",
        calf_cm: "35.0",
        hips_cm: "95.0",
        navel_cm: "85.0",
        note: `e2e-top-changes-${String(now.getTime())}`,
      },
      headers: { Accept: "application/json" },
    });
    if (response.status() === 409) {
      // Another spec holds that minute; try the one before.
      continue;
    }
    expect(
      response.ok(),
      `seed measurement failed: ${String(response.status())} ${await response.text()}`,
    ).toBeTruthy();
    seeded.push(measuredOn);
  }
  expect(seeded, "could not seed measurements in the current month").toHaveLength(count);
  return seeded;
}

/** Deletes the seeded entries, found by their minute through the charts read of the current month. */
async function removeEntries(page: Page, measuredOn: readonly string[]): Promise<void> {
  if (measuredOn.length === 0) {
    return;
  }
  const anchor = `${measuredOn[0].slice(0, 7)}-01`;
  const response = await page.request.get(`/api/measurements/chart?period=month&anchor=${anchor}`);
  if (!response.ok()) {
    return;
  }
  const body = (await response.json()) as { entries?: { id: string; measured_on: string }[] };
  const wanted = new Set(measuredOn);
  for (const entry of body.entries ?? []) {
    const minute = entry.measured_on.replace(" ", "T").slice(0, 16);
    if (wanted.has(minute)) {
      await page.request.post(`/api/measurements/${entry.id}/delete`, { form: { measured_on: minute } });
    }
  }
}

test("the Top progression tile renders the seeded charts below the Charts tile", async ({ page }) => {
  const seeded = await seedEntries(page, 2);
  try {
    await page.goto("/measurements");

    await expect(chartsTile(page)).toBeVisible();
    await expect(topSummary(page)).toBeVisible();
    await expect(periodButton(page, "Month")).toHaveAttribute("aria-pressed", "true");
    for (const title of chartTitles) {
      await expect(topTile(page).getByRole("figure", { name: title, exact: true })).toBeVisible();
    }
    // The seeded weight drops from 71.0 to 70.0 kg this month, so the loss chart has a series, not its empty text.
    await expect(topTile(page).getByRole("figure", { name: "Top weight loss", exact: true })).not.toContainText(
      "No losses in this period",
    );
  } finally {
    await removeEntries(page, seeded);
  }
});

test("the period controls change the window and the choice survives a reload", async ({ page }) => {
  const seeded = await seedEntries(page, 2);
  try {
    await page.goto("/measurements");
    const lastFiveYears = topTile(page).getByRole("button", { name: "Last 5 years", exact: true });
    const weightLoss = topTile(page).getByRole("figure", { name: "Top weight loss", exact: true });
    // The legend names the top sub-period: a year only on the Years axes, never a month's week like `3–9 Nov`.
    const yearInLegend = /Weight · \d{4}\s/;
    await expect(weightLoss).toContainText("Weight · ");
    await expect(weightLoss).not.toContainText(yearInLegend);

    await press(periodButton(page, "Years"));
    // Years is fixed to the last five years: the picker names them and cannot step.
    await expect(lastFiveYears).toBeDisabled();
    await expect(topTile(page).getByRole("button", { name: "Previous period", exact: true })).toBeDisabled();
    await expect(topTile(page).getByRole("button", { name: "Next period", exact: true })).toBeDisabled();
    await expect(weightLoss).toContainText(yearInLegend);
    // The Charts tile keeps its own period.
    await expect(
      chartsTile(page).getByRole("group", { name: "Chart period" }).getByRole("button", { name: "Month", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(periodButton(page, "Years")).toHaveAttribute("aria-pressed", "true");
    await expect(lastFiveYears).toBeVisible();
    await expect(weightLoss).toContainText(yearInLegend);

    await press(periodButton(page, "Week"));
    await expect(periodButton(page, "Years")).toHaveAttribute("aria-pressed", "false");
    await expect(lastFiveYears).toHaveCount(0);
  } finally {
    await removeEntries(page, seeded);
  }
});

test("the circumference filter is remembered across a reload", async ({ page }) => {
  await page.goto("/measurements");

  await openFilter(page);
  const chest = page.getByRole("menuitemcheckbox", { name: "Chest", exact: true });
  await expect(chest).toBeChecked();
  await chest.click();
  await expect(chest).not.toBeChecked();
  // The menu stays open, so the other fields are still checked in it.
  await expect(page.getByRole("menuitemcheckbox", { name: "Waist", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();

  await page.reload();
  await openFilter(page);
  await expect(page.getByRole("menuitemcheckbox", { name: "Chest", exact: true })).not.toBeChecked();
  await expect(page.getByRole("menuitemcheckbox", { name: "Waist", exact: true })).toBeChecked();
});

test("the Top progression summary toggles the tile and the closed state survives a reload", async ({ page }) => {
  await page.goto("/measurements");
  const periods = topTile(page).getByRole("group", { name: "Chart period" });
  const chartsPeriods = chartsTile(page).getByRole("group", { name: "Chart period" });
  await expect(periods).toBeVisible();

  await topSummary(page).click();
  await expect(periods).toBeHidden();
  // Each tile remembers its own open state.
  await expect(chartsPeriods).toBeVisible();

  await page.reload();
  await expect(topSummary(page)).toBeVisible();
  await expect(periods).toBeHidden();
  await expect(chartsPeriods).toBeVisible();

  await topSummary(page).click();
  await expect(periods).toBeVisible();
});
