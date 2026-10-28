// The Charts tile on the production preview: the summary toggles it and the closed state survives a reload, and the
// list's Visualize/Clear drive the tile across islands and survive a reload.
import { expect, test, type Locator, type Page } from "@playwright/test";

// Chromium exposes a <summary> as text inside the details group, not as a button, so the tile heading is found by text.
const tileSummary = /progression$|^Selected entries \(\d+\)$/;

function tileHeading(page: Page, name: string | RegExp = tileSummary): Locator {
  return page.getByText(name, { exact: true });
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DDTHH:mm` in UTC, the form the add endpoint takes with a zero offset. */
function minuteValue(at: Date): string {
  return `${String(at.getUTCFullYear())}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}T${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`;
}

/** Seeds `count` entries a few minutes in the past, in the current UTC month so the default list month shows them. */
async function seedEntries(page: Page, count: number): Promise<string[]> {
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
        note: `e2e-charts-${String(now.getTime())}`,
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

function rowCheckbox(page: Page, measuredOn: string): Locator {
  return page.getByRole("checkbox", { name: `Select measurement from ${measuredOn.replace("T", " ")}`, exact: true });
}

/** Clicks until the checkbox is checked: a click before the list island hydrates is dropped. */
async function check(box: Locator): Promise<void> {
  await expect(async () => {
    if (!(await box.isChecked())) {
      await box.click();
    }
    await expect(box).toBeChecked({ timeout: 1_000 });
  }).toPass();
}

test("the Charts summary toggles the tile and the closed state survives a reload", async ({ page }) => {
  await page.goto("/measurements");

  const summary = tileHeading(page);
  const periods = page.getByRole("group", { name: "Chart period" });
  await expect(summary).toBeVisible();
  await expect(periods).toBeVisible();

  await summary.click();
  await expect(periods).toBeHidden();

  await page.reload();
  await expect(tileHeading(page)).toBeVisible();
  await expect(periods).toBeHidden();

  await tileHeading(page).click();
  await expect(periods).toBeVisible();
});

test("Visualize charts the checked rows across a reload and Clear unchecks them", async ({ page }) => {
  const seeded = await seedEntries(page, 2);
  try {
    await page.goto("/measurements");
    const fifteen = page
      .getByRole("group", { name: "Entries per page" })
      .getByRole("button", { name: "15", exact: true });
    await expect(async () => {
      await fifteen.click();
      await expect(fifteen).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
    }).toPass();

    const first = rowCheckbox(page, seeded[0]);
    const second = rowCheckbox(page, seeded[1]);
    await check(first);
    await check(second);

    await page.getByRole("button", { name: "Visualize", exact: true }).click();
    await expect(tileHeading(page, "Selected entries (2)")).toBeVisible();
    await expect(page.getByRole("group", { name: "Chart period" })).toBeHidden();

    // Hovering the heading lists the two charted entries, one per line.
    await expect(tileHeading(page, "Selected entries (2)")).toHaveAttribute("title", /^[^\n]+\n[^\n]+$/);

    await page.reload();
    await expect(tileHeading(page, "Selected entries (2)")).toBeVisible();
    await expect(rowCheckbox(page, seeded[0])).toBeChecked();
    await expect(rowCheckbox(page, seeded[1])).toBeChecked();

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(tileHeading(page, /^Selected entries/)).toHaveCount(0);
    await expect(tileHeading(page, "Monthly progression")).toBeVisible();
    await expect(tileHeading(page, "Monthly progression")).not.toHaveAttribute("title");
    await expect(rowCheckbox(page, seeded[0])).not.toBeChecked();
    await expect(rowCheckbox(page, seeded[1])).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Visualize", exact: true })).toBeDisabled();
  } finally {
    await removeEntries(page, seeded);
  }
});
