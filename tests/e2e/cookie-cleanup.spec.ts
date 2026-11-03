// A signed-in request expires another account's `tm.*` cookies, keeps the session and the current account's own
// preference cookie, and that cookie lives at most 30 days. Creates no data.
import { expect, test } from "@playwright/test";

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;
const MARGIN_S = 60;
const PAGE_SIZE_PREFIX = "tm.measurements.pageSize.";

test("visiting /measurements expires another account's tm.* cookies and keeps the session and own preferences", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) {
    throw new Error("baseURL is not set");
  }
  const otherAccountId = crypto.randomUUID();
  const otherPageSize = `${PAGE_SIZE_PREFIX}${otherAccountId}`;
  const otherTrainee = `tm.measurements.trainee.${otherAccountId}`;
  await context.addCookies([
    { name: otherPageSize, value: "15", url: baseURL },
    { name: otherTrainee, value: crypto.randomUUID(), url: baseURL, httpOnly: true },
  ]);

  await page.goto("/measurements");
  await expect(page.getByRole("group", { name: "Entries per page" })).toBeVisible();

  // The journal writes its own page-size cookie after hydration.
  await expect
    .poll(async () =>
      (await context.cookies()).some((c) => c.name.startsWith(PAGE_SIZE_PREFIX) && c.name !== otherPageSize),
    )
    .toBe(true);

  const cookies = await context.cookies();
  const names = cookies.map((c) => c.name);
  expect(names).not.toContain(otherPageSize);
  expect(names).not.toContain(otherTrainee);
  expect(names.some((name) => name.startsWith("sb-"))).toBe(true);

  const own = cookies.find((c) => c.name.startsWith(PAGE_SIZE_PREFIX) && c.name !== otherPageSize);
  expect(own).toBeDefined();
  expect(own?.expires).toBeGreaterThan(0);
  expect(own?.expires).toBeLessThanOrEqual(Date.now() / 1000 + THIRTY_DAYS_S + MARGIN_S);
});
