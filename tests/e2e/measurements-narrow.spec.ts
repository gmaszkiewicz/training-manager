// Locks the signed-in trainee measurement row: a stack at 360px, one line at 1400px.
import { expect, test, type Locator, type Page } from "@playwright/test";

const metricLabels = [
  "Weight kg",
  "Chest cm",
  "Waist cm",
  "Arm cm",
  "Thigh cm",
  "Calf cm",
  "Hips cm",
  "Navel cm",
] as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function controlBox(control: Locator): Promise<Box> {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    throw new Error("missing bounding box");
  }
  return box;
}

function metric(page: Page, label: (typeof metricLabels)[number]): Locator {
  return page.getByRole("spinbutton", { name: label, exact: true });
}

function expectFullyInsideNarrowViewport(box: Box): void {
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
}

function expectVerticalCentersOverlap(weight: Box, navel: Box): void {
  const weightCenter = weight.y + weight.height / 2;
  const navelCenter = navel.y + navel.height / 2;
  expect(weightCenter).toBeGreaterThanOrEqual(navel.y);
  expect(weightCenter).toBeLessThanOrEqual(navel.y + navel.height);
  expect(navelCenter).toBeGreaterThanOrEqual(weight.y);
  expect(navelCenter).toBeLessThanOrEqual(weight.y + weight.height);
}

test.describe("360×800", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("date and metrics stay inside the viewport with navel below weight", async ({ page }) => {
    await page.goto("/measurements");

    const date = page.getByRole("button", { name: "Date and time", exact: true });
    await expect(date).toHaveAttribute("id", "measured_on");
    expectFullyInsideNarrowViewport(await controlBox(date));

    let weight: Box | null = null;
    let navel: Box | null = null;
    for (const label of metricLabels) {
      const box = await controlBox(metric(page, label));
      expectFullyInsideNarrowViewport(box);
      if (label === "Weight kg") {
        weight = box;
      }
      if (label === "Navel cm") {
        navel = box;
      }
    }
    expect(weight).not.toBeNull();
    expect(navel).not.toBeNull();
    if (weight === null || navel === null) {
      throw new Error("missing weight or navel box");
    }
    expect(navel.y).toBeGreaterThan(weight.y + weight.height);
  });
});

test.describe("1400×900", () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test("navel sits to the right of weight on one row", async ({ page }) => {
    await page.goto("/measurements");

    const weight = await controlBox(metric(page, "Weight kg"));
    const navel = await controlBox(metric(page, "Navel cm"));

    expect(navel.x).toBeGreaterThanOrEqual(weight.x + weight.width);
    expectVerticalCentersOverlap(weight, navel);
  });
});
