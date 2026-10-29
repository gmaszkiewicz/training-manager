// The add form on the production preview starts from the latest entry: an entry added through the form is what the
// reopened form shows, with an empty note and no difference against it.
import { expect, test, type Locator, type Page } from "@playwright/test";

// Distinct from the values other specs seed, so a prefill from any other entry fails the check.
const typed = [
  { label: "Weight", unit: "kg", value: "71.3" },
  { label: "Chest", unit: "cm", value: "91.7" },
  { label: "Waist", unit: "cm", value: "81.4" },
  { label: "Arm", unit: "cm", value: "31.2" },
  { label: "Thigh", unit: "cm", value: "56.6" },
  { label: "Calf", unit: "cm", value: "36.9" },
  { label: "Hips", unit: "cm", value: "96.8" },
  { label: "Navel", unit: "cm", value: "86.1" },
] as const;

function metric(page: Page, label: string, unit: string): Locator {
  return page.getByRole("spinbutton", { name: `${label} ${unit}`, exact: true });
}

async function showAddForm(page: Page): Promise<void> {
  const date = page.getByRole("button", { name: "Date and time", exact: true });
  if (!(await date.isVisible())) {
    await page.getByRole("button", { name: "Add your next measurement" }).click();
    await expect(date).toBeVisible();
  }
  // The server renders the date empty; the browser minute shows once the island hydrates and takes input.
  await expect(date).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
}

/** Deletes the added entry, found by its minute through the charts read of its month. */
async function removeEntry(page: Page, measuredOn: string): Promise<void> {
  const anchor = `${measuredOn.slice(0, 7)}-01`;
  const response = await page.request.get(`/api/measurements/chart?period=month&anchor=${anchor}`);
  if (!response.ok()) {
    return;
  }
  const body = (await response.json()) as { entries?: { id: string; measured_on: string }[] };
  for (const entry of body.entries ?? []) {
    const minute = entry.measured_on.replace(" ", "T").slice(0, 16);
    if (minute === measuredOn) {
      await page.request.post(`/api/measurements/${entry.id}/delete`, { form: { measured_on: minute } });
    }
  }
}

/** `YYYY-MM-DD` of yesterday on the browser's clock, the day the date picker shows as yesterday. */
async function browserYesterday(page: Page): Promise<string> {
  return page.evaluate(() => {
    const day = new Date();
    day.setDate(day.getDate() - 1);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${String(day.getFullYear())}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  });
}

/** Picks yesterday in the open date picker: the grid runs day by day, so it is the cell before the selected one. */
async function pickYesterday(page: Page): Promise<void> {
  const days = page.locator("details[data-add-form]").locator("button[aria-pressed]");
  const selected = await days.evaluateAll((buttons) =>
    buttons.findIndex((button) => button.getAttribute("aria-pressed") === "true"),
  );
  if (selected > 0) {
    await days.nth(selected - 1).click();
    return;
  }
  // Today is a Monday the 1st, so yesterday ends the previous month's grid.
  await page.getByRole("button", { name: "Previous month", exact: true }).click();
  await days.last().click();
}

test("a picked minute refills the untyped fields from the entry before it", async ({ page }) => {
  const earlier = {
    weight: "64.2",
    chest: "88.8",
    waist: "77.7",
    arms: "29.9",
    thigh: "52.2",
    calf: "33.3",
    hips: "92.2",
    navel: "82.8",
  };
  await page.goto("/measurements");
  await showAddForm(page);

  // Yesterday at 03:00 is far from the minutes other specs seed, so the entry before 03:30 is this one.
  const seeded = `${await browserYesterday(page)}T03:00`;
  const response = await page.request.post("/api/measurements", {
    form: {
      measured_on: seeded,
      utc_offset_minutes: String(await page.evaluate(() => new Date().getTimezoneOffset())),
      weight_kg: earlier.weight,
      chest_cm: earlier.chest,
      waist_cm: earlier.waist,
      arms_cm: earlier.arms,
      thigh_cm: earlier.thigh,
      calf_cm: earlier.calf,
      hips_cm: earlier.hips,
      navel_cm: earlier.navel,
    },
    headers: { Accept: "application/json" },
  });
  expect(response.ok(), `seed measurement failed: ${String(response.status())} ${await response.text()}`).toBeTruthy();

  try {
    const weight = metric(page, "Weight", "kg");
    await weight.fill("99.9");

    await page.getByRole("button", { name: "Date and time", exact: true }).click();
    await pickYesterday(page);
    await page.getByRole("textbox", { name: "Hour", exact: true }).fill("03");
    await page.getByRole("textbox", { name: "Minute", exact: true }).fill("30");
    await expect(page.getByRole("button", { name: "Date and time", exact: true })).toHaveText(
      `${seeded.slice(0, 10)} 03:30`,
    );

    await expect(weight).toHaveValue("99.9");
    await expect(metric(page, "Chest", "cm")).toHaveValue(earlier.chest);
    await expect(metric(page, "Waist", "cm")).toHaveValue(earlier.waist);
    await expect(metric(page, "Arm", "cm")).toHaveValue(earlier.arms);
    await expect(metric(page, "Thigh", "cm")).toHaveValue(earlier.thigh);
    await expect(metric(page, "Calf", "cm")).toHaveValue(earlier.calf);
    await expect(metric(page, "Hips", "cm")).toHaveValue(earlier.hips);
    await expect(metric(page, "Navel", "cm")).toHaveValue(earlier.navel);
  } finally {
    await removeEntry(page, seeded);
  }
});

test("an entry added through the form is what the reopened form starts with", async ({ page }) => {
  // The difference compares against the entry before the form's minute, so the check waits for the next minute.
  test.setTimeout(test.info().timeout + 75_000);
  await page.goto("/measurements");
  await showAddForm(page);

  for (const field of typed) {
    const input = metric(page, field.label, field.unit);
    await input.fill(field.value);
    await expect(input).toHaveValue(field.value);
  }

  // The shown minute is what the form sends; it stands in for the notice's minute if the save never navigates.
  let added = (await page.getByRole("button", { name: "Date and time", exact: true }).innerText()).replace(" ", "T");
  try {
    await page.getByRole("button", { name: "Add measurement", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get("notice") === "added");
    const notified = new URL(page.url()).searchParams.get("measured_on");
    expect(notified, "the added notice names no minute").not.toBeNull();
    added = notified ?? added;

    // Reopen the form past the added minute, so the entry it compares against is the added one.
    await expect
      .poll(
        () =>
          page.evaluate((minute) => {
            const now = new Date();
            const pad = (value: number) => String(value).padStart(2, "0");
            const local = `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            return local > minute;
          }, added),
        { timeout: 70_000, intervals: [1_000] },
      )
      .toBe(true);

    await page.goto("/measurements");
    await showAddForm(page);

    for (const field of typed) {
      await expect(metric(page, field.label, field.unit)).toHaveValue(field.value);
    }
    await expect(page.getByRole("textbox", { name: "Note", exact: true })).toHaveValue("");
    for (const field of typed) {
      await expect(
        page.locator("details[data-add-form]").locator(`[aria-label="${field.label} unchanged 0.0 ${field.unit}"]`),
      ).toHaveText("0.0");
    }
  } finally {
    await removeEntry(page, added);
  }
});
