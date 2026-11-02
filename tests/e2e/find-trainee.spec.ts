// Find trainee in the top bar: a throwaway trainer opens the dialog from the trigger, closes it with Esc and with a click
// outside, sees which dashboards it can request, and gets "No trainee with that email" as a toast outside the open
// dialog for an unknown address; dismissing a toast keeps the dialog open. It finds a named throwaway trainee by first
// and last name, and a typed name without "@" is not sent. The seeded trainee (the default storage state) does not see
// the trigger.
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

  let traineeContext: BrowserContext | undefined;

  // A throwaway trainee in its own signed-out context, with a unique first and last name saved on its profile.
  async function signUpNamedTrainee(browser: Browser): Promise<{ email: string; firstName: string; lastName: string }> {
    traineeContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const traineePage = await traineeContext.newPage();
    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const email = `e2e-find-named-${token}@example.com`;
    const firstName = `Ada${token}`;
    const lastName = `Lovelace${token}`;
    const signup = await traineePage.request.post("/api/auth/signup", {
      form: { email, password: "E2e-Find-Trainee-Passw0rd!", role: "trainee" },
    });
    expect(signup.ok(), `trainee signup failed: ${signup.status()}`).toBeTruthy();
    test.skip(
      !new URL(signup.url()).pathname.startsWith("/measurements"),
      "Sign-up needs email confirmation on this Supabase; the name search needs a signed-in throwaway trainee.",
    );
    // The first /measurements visit creates the profile row the names are saved on.
    await traineePage.goto("/measurements");
    const saved = await traineePage.request.post("/api/profile", { form: { firstName, lastName } });
    expect(saved.ok(), `saving the trainee's names failed: ${saved.status()}`).toBeTruthy();
    expect(new URL(saved.url()).searchParams.get("notice")).toBe("profile-saved");
    return { email, firstName, lastName };
  }

  test.afterEach(async () => {
    await trainerContext?.close();
    trainerContext = undefined;
    await traineeContext?.close();
    traineeContext = undefined;
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
    const email = dialog.getByRole("textbox", { name: "Trainee" });
    await email.fill(unknownEmail);
    await expect(email).toHaveValue(unknownEmail);
    await dialog.getByRole("button", { name: "Request access", exact: true }).click();

    const stack = page.locator("body > [data-error-toast-stack]");
    const toast = stack.getByText("No trainee with that email");
    await expect(toast).toBeVisible();
    await expect(dialog.getByText("No trainee with that email")).toHaveCount(0);
    await expect(dialog).toBeVisible();

    await stack.getByRole("button", { name: "Dismiss error" }).click();
    await expect(toast).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(email).toHaveValue(unknownEmail);
  });

  test("a first and last name find the trainee, and choosing the match fills in the email", async ({ browser }) => {
    const trainee = await signUpNamedTrainee(browser);
    const page = await signUpTrainer(browser);
    const dialog = await openFindTrainee(page);

    const field = dialog.getByRole("textbox", { name: "Trainee" });
    const fullName = `${trainee.firstName} ${trainee.lastName}`;
    const match = dialog.getByRole("button").filter({ hasText: trainee.email });
    // A React island drops input typed before it hydrates, and then no match opens. Retry until the match shows.
    // Clear first: re-filling the same value fires no change event.
    await expect(async () => {
      await field.fill("");
      await field.fill(fullName);
      await expect(match).toBeVisible({ timeout: 2_000 });
    }).toPass();
    await expect(match).toHaveCount(1);

    // The full name sits over the email.
    const name = match.getByText(fullName, { exact: true });
    const address = match.getByText(trainee.email, { exact: true });
    await expect(name).toBeVisible();
    await expect(address).toBeVisible();
    const nameBox = await name.boundingBox();
    const addressBox = await address.boundingBox();
    if (nameBox === null || addressBox === null) {
      throw new Error("missing bounding box");
    }
    expect(nameBox.y).toBeLessThan(addressBox.y);

    await match.click();
    await expect(match).toHaveCount(0);
    await expect(field).toHaveValue(trainee.email);
  });

  test("a typed name without @ is not sent and toasts Choose a trainee from the list", async ({ browser }) => {
    const page = await signUpTrainer(browser);
    const dialog = await openFindTrainee(page);

    // A name nobody has, so no match list covers Request access.
    const field = dialog.getByRole("textbox", { name: "Trainee" });
    const typed = `Nobody${Date.now().toString(36)}`;
    await field.fill(typed);
    await expect(field).toHaveValue(typed);
    await dialog.getByRole("button", { name: "Request access", exact: true }).click();

    const stack = page.locator("body > [data-error-toast-stack]");
    await expect(stack.getByText("Choose a trainee from the list")).toBeVisible();
    await expect(dialog.getByText("Choose a trainee from the list")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
  });

  test("dismissing the empty-email toast keeps the dialog open", async ({ browser }) => {
    const page = await signUpTrainer(browser);
    const dialog = await openFindTrainee(page);

    await dialog.getByRole("button", { name: "Request access", exact: true }).click();
    const stack = page.locator("body > [data-error-toast-stack]");
    await expect(stack.getByText("Enter an email address")).toBeVisible();

    await stack.getByRole("button", { name: "Dismiss error" }).click();
    await expect(stack.getByText("Enter an email address")).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });
});

test("a trainee does not see Find trainee in the top bar", async ({ page }) => {
  await page.goto("/measurements");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(trigger(page)).toHaveCount(0);
  await expect(page.locator("[data-find-trainee-trigger]")).toHaveCount(0);
});
