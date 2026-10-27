// Hub collaborations: a throwaway trainer sends a request from /measurements, the seeded trainee accepts it in the Hub,
// and the trainer unlinks after confirming. Runs at desktop width and at 360×800. The Hub tab content is as narrow as
// Profile and Settings, so row actions sit behind the "Actions for …" menu at every width.
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

for (const { name, viewport } of widths) {
  test.describe(`hub collaborations at ${name}`, () => {
    test.use({ viewport });

    let trainerContext: BrowserContext | undefined;

    // Leave the seeded trainee without this run's trainer, whatever step failed. A hook still runs after a timeout.
    test.afterEach(async () => {
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
    });

    test("a trainer request is accepted by the trainee in the Hub and then unlinked", async ({ page, browser }) => {
      const traineeEmail = process.env.E2E_USERNAME;
      if (!traineeEmail) {
        throw new Error("Set E2E_USERNAME (see context/foundation/test-stack.md, ## E2E)");
      }

      // A fresh, signed-out context for a throwaway trainer, unique per run so retries don't collide.
      trainerContext = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport });
      const trainerPage = await trainerContext.newPage();
      const trainerEmail = `e2e-hub-trainer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      const signup = await trainerPage.request.post("/api/auth/signup", {
        form: { email: trainerEmail, password: "E2e-Hub-Trainer-Passw0rd!", role: "trainer" },
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

      await test.step("the trainee opens the Hub from the avatar menu and accepts the request", async () => {
        await page.goto("/measurements");
        await openAccountMenu(page);
        await page.getByRole("menuitem", { name: "Hub" }).click();
        await expect(page).toHaveURL(/\/hub\/collaborations\/?$/);
        await expect(page.getByRole("tab", { name: "Collaborations", selected: true })).toBeVisible();

        const row = collaborationRow(page, trainerEmail);
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
        await expect(collaborationRow(page, trainerEmail)).toHaveCount(0);
      });
    });
  });
}
