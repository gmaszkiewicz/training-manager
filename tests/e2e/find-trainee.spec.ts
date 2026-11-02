// Find trainee in the top bar: a throwaway trainer opens the dialog from the trigger, closes it with Esc and with a click
// outside, sees which dashboards it can request, and gets "No trainee with that email" as a toast outside the open
// dialog for an unknown address. The seeded trainee (the default storage state) does not see the trigger.
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

const description = "Request access to a trainee's dashboards";

function trigger(page: Page): Locator {
  return page.getByRole("button", { name: "Find trainee", exact: true });
}

function findDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Find trainee" });
}

// A click before the island hydrates opens nothing. Retry until the dialog shows.
async function openFindTrainee(page: Page): Promise<Locator> {
  const dialog = findDialog(page);
  await expect(trigger(page)).toBeVisible();
  await expect(async () => {
    await trigger(page).click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  // While the overlay and content are still animating in, an outside click can land unheard; wait for them to settle.
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-content"]')]
        .flatMap((element) => element.getAnimations())
        .map((animation) => animation.finished),
    ),
  );
  return dialog;
}

test.describe("find trainee as a trainer", () => {
  let trainerContext: BrowserContext | undefined;

  // A fresh, signed-out context for a throwaway trainer, unique per run so retries don't collide.
  async function signUpTrainer(browser: Browser): Promise<Page> {
    trainerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const trainerPage = await trainerContext.newPage();
    const runTrainer = `e2e-find-trainer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const signup = await trainerPage.request.post("/api/auth/signup", {
      form: { email: runTrainer, password: "E2e-Find-Trainer-Passw0rd!", role: "trainer" },
    });
    expect(signup.ok(), `trainer signup failed: ${signup.status()}`).toBeTruthy();
    test.skip(
      !new URL(signup.url()).pathname.startsWith("/measurements"),
      "Sign-up needs email confirmation on this Supabase; Find trainee needs a signed-in throwaway trainer.",
    );
    await trainerPage.goto("/measurements");
    return trainerPage;
  }

  test.afterEach(async () => {
    await trainerContext?.close();
    trainerContext = undefined;
  });

  test("the trigger opens the dialog, and Esc or a click outside closes it", async ({ browser }) => {
    const page = await signUpTrainer(browser);

    const dialog = await openFindTrainee(page);
    await expect(dialog.getByRole("heading", { name: "Find trainee", exact: true })).toBeVisible();
    await expect(dialog.getByText(description, { exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await openFindTrainee(page);
    // The overlay covers the page around the centered dialog; its top-left corner is outside the dialog.
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
  });

  test("only Measurements can be requested, and unchecking it disables Request access", async ({ browser }) => {
    const page = await signUpTrainer(browser);
    const dialog = await openFindTrainee(page);

    const measurements = dialog.getByRole("checkbox", { name: "Measurements", exact: true });
    const requestAccess = dialog.getByRole("button", { name: "Request access", exact: true });
    await expect(measurements).toBeChecked();
    await expect(measurements).toBeEnabled();
    for (const name of ["Nutrition", "Training", "Planning"]) {
      await expect(dialog.getByRole("checkbox", { name, exact: true })).toBeDisabled();
    }
    await expect(requestAccess).toBeEnabled();

    await measurements.click();
    await expect(measurements).not.toBeChecked();
    await expect(requestAccess).toBeDisabled();
  });

  test("an unknown email keeps the dialog open and toasts the not found sentence outside it", async ({ browser }) => {
    const page = await signUpTrainer(browser);
    const dialog = await openFindTrainee(page);

    const unknownEmail = `e2e-find-missing-${Date.now()}@example.com`;
    const email = dialog.getByRole("textbox", { name: "Email" });
    await email.fill(unknownEmail);
    await expect(email).toHaveValue(unknownEmail);
    await dialog.getByRole("button", { name: "Request access", exact: true }).click();

    const toast = page.locator("body > [data-error-toast-stack]").getByText("No trainee with that email");
    await expect(toast).toBeVisible();
    await expect(dialog.getByText("No trainee with that email")).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });
});

test("a trainee does not see Find trainee in the top bar", async ({ page }) => {
  await page.goto("/measurements");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(trigger(page)).toHaveCount(0);
  await expect(page.locator("[data-find-trainee-trigger]")).toHaveCount(0);
});
