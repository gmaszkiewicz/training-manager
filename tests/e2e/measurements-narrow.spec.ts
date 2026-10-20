// Locks the signed-in trainee measurement row: a sideways metric strip at 360px, one line at 1400px.
import { expect, test, type Locator, type Page } from "@playwright/test";

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

function metric(page: Page, label: "Weight kg" | "Navel cm"): Locator {
  return page.getByRole("spinbutton", { name: label, exact: true });
}

function expectFullyInsideNarrowViewport(box: Box): void {
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
}

async function showAddForm(page: Page): Promise<void> {
  const date = page.getByRole("button", { name: "Date and time", exact: true });
  if (await date.isVisible()) {
    return;
  }
  await page.getByRole("button", { name: "Add your next measurement" }).click();
  await expect(date).toBeVisible();
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

  test("date and weight stay inside the viewport and navel sits to the right", async ({ page }) => {
    await page.goto("/measurements");
    await showAddForm(page);

    const date = page.getByRole("button", { name: "Date and time", exact: true });
    await expect(date).toHaveAttribute("id", "measured_on");
    expectFullyInsideNarrowViewport(await controlBox(date));

    const weight = await controlBox(metric(page, "Weight kg"));
    const navel = await controlBox(metric(page, "Navel cm"));
    expectFullyInsideNarrowViewport(weight);
    expect(navel.x).toBeGreaterThanOrEqual(weight.x + weight.width);
    expectVerticalCentersOverlap(weight, navel);
  });
});

test.describe("1400×900", () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test("navel sits to the right of weight on one row", async ({ page }) => {
    await page.goto("/measurements");
    await showAddForm(page);

    const weight = await controlBox(metric(page, "Weight kg"));
    const navel = await controlBox(metric(page, "Navel cm"));

    expect(navel.x).toBeGreaterThanOrEqual(weight.x + weight.width);
    expectVerticalCentersOverlap(weight, navel);
  });
});
