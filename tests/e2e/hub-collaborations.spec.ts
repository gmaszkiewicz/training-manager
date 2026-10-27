// Hub collaborations: a throwaway trainer sends a request from /measurements, the seeded trainee accepts it in the Hub,
// and the trainer unlinks after confirming. Each side's notifications are checked on the way: the trainee opens the
// request from the bell, and the trainer marks the "accepted" notification read and deletes it in the Hub. Runs at
// desktop width and at 360×800. The Hub tab content is as narrow as Profile and Settings, so row actions sit behind
// the "Actions for …" menu at every width.
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

const widths = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "360×800", viewport: { width: 360, height: 800 } },
];

function collaborationRow(page: Page, email: string): Locator {
  return page.getByRole("row").filter({ hasText: email });
}

async function openAccountMenu(page: Page): Promise<void> {
  const account = page.getByRole("button", { name: "Account menu" });
  await expect(account).toBeVisible();
  // A click before the island hydrates opens nothing. Retry until the menu shows.
  await expect(async () => {
    await account.click();
    await expect(page.getByRole("menuitem", { name: "Hub" })).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

// Row actions sit behind an ellipsis menu that hydrates on load. Retry until the menu shows.
async function chooseRowAction(row: Locator, page: Page, item: string): Promise<void> {
  const actions = row.getByRole("button", { name: /^Actions for / });
  await expect(actions).toBeVisible();
  await expect(async () => {
    await actions.click();
    await expect(page.getByRole("menuitem", { name: item })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page.getByRole("menuitem", { name: item }).click();
}

// The database lets the trainer delete its own link in any status; the intent only picks the notice wording.
async function removeLeftoverLink(trainerPage: Page, traineeEmail: string): Promise<void> {
  await trainerPage.goto("/hub/collaborations");
  const row = collaborationRow(trainerPage, traineeEmail);
  if ((await row.count()) === 0) {
    return;
  }
  // A pending row carries the id in its form; a linked row only in its confirm link.
  const field = row.locator('input[name="other"]');
  const confirmLink = row.locator('a[href*="confirm="]');
  let other: string | null = null;
  if ((await field.count()) > 0) {
    other = await field.first().getAttribute("value");
  } else if ((await confirmLink.count()) > 0) {
    const href = (await confirmLink.first().getAttribute("href")) ?? "";
    other = new URL(href, trainerPage.url()).searchParams.get("confirm");
  }
  if (!other) {
    return;
  }
  await trainerPage.request.post("/api/collaborations/remove", {
    form: { other, page: "1", intent: "cancel" },
  });
}

// Trainers from earlier runs whose cleanup never ran would sort above this run's row and could push it past the
// first page of five. Remove only links older than ten minutes, so a parallel run's fresh request is left alone.
async function removeStaleHubTrainers(traineePage: Page): Promise<void> {
  const staleBefore = Date.now() - 10 * 60_000;
  for (let pass = 0; pass < 20; pass += 1) {
    await traineePage.goto("/hub/collaborations");
    const stale: string[] = [];
    for (const row of await traineePage.getByRole("row").filter({ hasText: "e2e-hub-trainer-" }).all()) {
      const startedAt = Number(/e2e-hub-trainer-(\d+)-/.exec(await row.innerText())?.[1] ?? Number.NaN);
      const field = row.locator('input[name="other"]');
      const confirmLink = row.locator('a[href*="confirm="]');
      let other: string | null = null;
      if ((await field.count()) > 0) {
        other = await field.first().getAttribute("value");
      } else if ((await confirmLink.count()) > 0) {
        const href = (await confirmLink.first().getAttribute("href")) ?? "";
        other = new URL(href, traineePage.url()).searchParams.get("confirm");
      }
      if (other && startedAt < staleBefore) {
        stale.push(other);
      }
    }
    if (stale.length === 0) {
      return;
    }
    for (const other of stale) {
      await traineePage.request.post("/api/collaborations/remove", { form: { other, page: "1", intent: "remove" } });
    }
  }
}

function notificationRow(page: Page, text: string | RegExp): Locator {
  return page.getByRole("row").filter({ hasText: text });
}

// The bell trigger is always there for a signed-in user; its label carries the unread count.
async function openBell(page: Page, item: Locator): Promise<void> {
  const bell = page.getByRole("button", { name: /^Notifications, \d+ unread$/ });
  await expect(bell).toBeVisible();
  // A click before the island hydrates opens nothing. Retry until the menu shows.
  await expect(async () => {
    await bell.click();
    await expect(item).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

// The checkboxes are a React island; a click before it hydrates checks nothing. Retry until checked.
async function check(checkbox: Locator): Promise<void> {
  await expect(checkbox).toBeVisible();
  await expect(async () => {
    if ((await checkbox.getAttribute("aria-checked")) !== "true") {
      await checkbox.click();
    }
    await expect(checkbox).toBeChecked({ timeout: 1_000 });
  }).toPass();
}

// Users may delete their own notifications. Collects the ids of every row the predicate keeps, page by page, and
// deletes them through the form route the table uses (at most 15 ids per request).
async function removeNotifications(page: Page, keep: (text: string) => boolean): Promise<void> {
  const ids: string[] = [];
  for (let current = 1; current <= 50; current += 1) {
    await page.goto(`/hub/notifications?page=${String(current)}&size=15`);
    for (const row of await page
      .getByRole("row")
      .filter({ has: page.locator('input[name="id"]') })
      .all()) {
      const id = await row.locator('input[name="id"]').first().getAttribute("value");
      if (id && keep(await row.innerText())) {
        ids.push(id);
      }
    }
    if ((await page.locator('a[aria-label="Next page"]').count()) === 0) {
      break;
    }
  }
  for (let start = 0; start < ids.length; start += 15) {
    const body = new URLSearchParams({ page: "1", size: "15" });
    for (const id of ids.slice(start, start + 15)) {
      body.append("ids", id);
    }
    await page.request.post("/api/notifications/delete", {
      data: body.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }
}

// Notifications naming a trainer from an earlier run (here or one whose cleanup never ran) would push this run's
// request past the bell's five items. Remove only those older than ten minutes, so a parallel run's are left alone.
async function removeStaleHubNotifications(traineePage: Page): Promise<void> {
  const staleBefore = Date.now() - 10 * 60_000;
  await removeNotifications(traineePage, (text) => {
    const startedAt = Number(/e2e-hub-trainer-(\d+)-/.exec(text)?.[1] ?? Number.NaN);
    return startedAt < staleBefore;
  });
}

for (const { name, viewport } of widths) {
  test.describe(`hub collaborations at ${name}`, () => {
    test.use({ viewport });

    let trainerContext: BrowserContext | undefined;
    let trainerEmail: string | undefined;

    // Leave the seeded trainee without this run's trainer or its notifications, whatever step failed. Removing a
    // leftover link writes one more notification, so notifications go last. A hook still runs after a timeout.
    test.afterEach(async ({ page }) => {
      const traineeEmail = process.env.E2E_USERNAME;
      if (trainerContext === undefined) {
        return;
      }
      const trainerPage = trainerContext.pages().at(0);
      if (traineeEmail && trainerPage !== undefined) {
        await removeLeftoverLink(trainerPage, traineeEmail);
      }
      await trainerContext.close();
      trainerContext = undefined;
      const runTrainer = trainerEmail;
      trainerEmail = undefined;
      if (runTrainer !== undefined) {
        await removeNotifications(page, (text) => text.includes(runTrainer));
      }
    });

    test("a trainer request is accepted by the trainee in the Hub and then unlinked", async ({ page, browser }) => {
      const traineeEmail = process.env.E2E_USERNAME;
      if (!traineeEmail) {
        throw new Error("Set E2E_USERNAME (see context/foundation/test-stack.md, ## E2E)");
      }

      // A fresh, signed-out context for a throwaway trainer, unique per run so retries don't collide.
      trainerContext = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport });
      const trainerPage = await trainerContext.newPage();
      const runTrainer = `e2e-hub-trainer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      trainerEmail = runTrainer;

      const signup = await trainerPage.request.post("/api/auth/signup", {
        form: { email: runTrainer, password: "E2e-Hub-Trainer-Passw0rd!", role: "trainer" },
      });
      expect(signup.ok(), `trainer signup failed: ${signup.status()}`).toBeTruthy();
      test.skip(
        !new URL(signup.url()).pathname.startsWith("/measurements"),
        "Sign-up needs email confirmation on this Supabase; the Hub flow needs a signed-in throwaway trainer.",
      );

      await test.step("the trainer sends a request from /measurements", async () => {
        await trainerPage.goto("/measurements");
        const email = trainerPage.getByRole("textbox", { name: "Email" });
        // A React island drops input typed before it hydrates, and then no suggestion opens. Retry until the seeded
        // trainee's address shows as a match. Clear first: re-filling the same value fires no change event.
        const match = trainerPage.getByRole("button", { name: traineeEmail, exact: true });
        await expect(async () => {
          await email.fill("");
          await email.fill(traineeEmail);
          await expect(match).toBeVisible({ timeout: 2_000 });
        }).toPass();
        // Choosing the match closes the list, so it no longer covers Send request.
        await match.click();
        await expect(match).toHaveCount(0);
        await trainerPage.getByRole("button", { name: "Send request" }).click();
        await expect(trainerPage.getByText(`Your request has been sent to ${traineeEmail}`)).toBeVisible();
      });

      await test.step("stale trainers from earlier runs are cleared from the trainee's list", async () => {
        await removeStaleHubTrainers(page);
        await removeStaleHubNotifications(page);
      });

      const requested = `Trainer ${runTrainer} sent you a link request`;

      await test.step("the trainee opens the request from the bell and lands on Collaborations", async () => {
        await page.goto("/measurements");
        const item = page.getByRole("menuitem", { name: requested });
        await openBell(page, item);
        await item.click();
        await expect(page).toHaveURL(/\/hub\/collaborations\/?$/);
        await expect(page.getByRole("tab", { name: "Collaborations", selected: true })).toBeVisible();

        await page.goto("/hub/notifications?page=1&size=15");
        const row = notificationRow(page, requested);
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(/\bRead/);
        await expect(row).not.toContainText("Unread");
      });

      await test.step("the trainee opens the Hub from the avatar menu and accepts the request", async () => {
        await page.goto("/measurements");
        await openAccountMenu(page);
        await page.getByRole("menuitem", { name: "Hub" }).click();
        await expect(page).toHaveURL(/\/hub\/collaborations\/?$/);
        await expect(page.getByRole("tab", { name: "Collaborations", selected: true })).toBeVisible();

        const row = collaborationRow(page, runTrainer);
        await expect(row).toHaveCount(1);
        await expect(row.getByRole("cell", { name: "Pending", exact: true })).toBeVisible();
        await chooseRowAction(row, page, "Accept request");
        await expect(page.getByText("Request accepted")).toBeVisible();
        await expect(row.getByRole("cell", { name: "Linked", exact: true })).toBeVisible();
      });

      await test.step("the trainer sees the trainee as Linked and unlinks after confirming", async () => {
        await trainerPage.goto("/hub/collaborations");
        const row = collaborationRow(trainerPage, traineeEmail);
        await expect(row).toHaveCount(1);
        await expect(row.getByRole("cell", { name: "Linked", exact: true })).toBeVisible();
        await chooseRowAction(row, trainerPage, "Unlink");
        await expect(trainerPage).toHaveURL(/[?&]confirm=/);
        const confirm = trainerPage.getByRole("alertdialog");
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", { name: "Unlink" }).click();
        await expect(trainerPage.getByText("Trainee unlinked")).toBeVisible();
        await expect(row).toHaveCount(0);
      });

      await test.step("the trainee's list no longer shows that trainer", async () => {
        await page.goto("/hub/collaborations");
        await expect(page.getByRole("tab", { name: "Collaborations", selected: true })).toBeVisible();
        await expect(collaborationRow(page, runTrainer)).toHaveCount(0);
      });

      // The item's name also carries its received time, so the pattern is not anchored at the end.
      const accepted = /^Trainee .+ accepted your link request/;

      await test.step("the trainer's bell lists the accepted request", async () => {
        await trainerPage.goto("/measurements");
        // A fresh trainer has exactly this one notification.
        await expect(trainerPage.getByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();
        await openBell(trainerPage, trainerPage.getByRole("menuitem", { name: accepted }));
      });

      await test.step("the trainer selects all and marks them read in the Hub", async () => {
        await trainerPage.goto("/hub/notifications");
        await expect(trainerPage.getByRole("tab", { name: "Notifications", selected: true })).toBeVisible();
        const row = notificationRow(trainerPage, "accepted your link request");
        await expect(row).toHaveCount(1);
        await expect(row).toContainText("Unread");
        await check(trainerPage.getByRole("checkbox", { name: "Select all" }));
        await trainerPage.getByRole("button", { name: "Mark as read" }).click();
        await expect(trainerPage.getByText("Notifications marked as read")).toBeVisible();
        await expect(row).not.toContainText("Unread");

        await trainerPage.reload();
        await expect(trainerPage.getByRole("button", { name: "Notifications, 0 unread" })).toBeVisible();
      });

      await test.step("the trainer selects one and deletes it after confirming", async () => {
        await trainerPage.goto("/hub/notifications");
        const row = notificationRow(trainerPage, "accepted your link request");
        await expect(row).toHaveCount(1);
        await check(row.getByRole("checkbox", { name: /^Select notification from / }));
        await trainerPage.getByRole("button", { name: "Delete", exact: true }).click();
        const confirm = trainerPage.getByRole("alertdialog");
        await expect(confirm).toBeVisible();
        await expect(confirm).toContainText("Delete 1 notification for good?");
        await confirm.getByRole("button", { name: "Delete", exact: true }).click();
        await expect(trainerPage.getByText("Notifications deleted")).toBeVisible();
        await expect(row).toHaveCount(0);
        await expect(trainerPage.getByText("No notifications")).toBeVisible();
      });
    });
  });
}
