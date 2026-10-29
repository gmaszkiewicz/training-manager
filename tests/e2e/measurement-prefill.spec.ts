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
      await expect(page.locator(`[aria-label="${field.label} unchanged 0.0 ${field.unit}"]`)).toHaveText("0.0");
    }
  } finally {
    await removeEntry(page, added);
  }
});
