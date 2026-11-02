// Seeds and removes the throwaway trainee's measurements for specs that need entries in the list's default month.
// Every spec shares the one trainee, so a spec that seeds entries removes them afterwards.
import { expect, test, type Page } from "@playwright/test";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DDTHH:mm` in UTC, the form the add endpoint takes with a zero offset. */
function minuteValue(at: Date): string {
  return `${String(at.getUTCFullYear())}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}T${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`;
}

/** Seeds `count` entries a few minutes in the past, in the current UTC month so the default list month shows them. */
export async function seedEntries(page: Page, count: number, note: string): Promise<string[]> {
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
    const response = await page.request.post("/api/measurements", {
      form: {
        measured_on: measuredOn,
        utc_offset_minutes: "0",
        weight_kg: (70 + seeded.length).toFixed(1),
        chest_cm: "90.0",
        waist_cm: "80.0",
        arms_cm: "30.0",
        thigh_cm: "55.0",
        calf_cm: "35.0",
        hips_cm: "95.0",
        navel_cm: "85.0",
        note: `${note}-${String(now.getTime())}`,
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
export async function removeEntries(page: Page, measuredOn: readonly string[]): Promise<void> {
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
