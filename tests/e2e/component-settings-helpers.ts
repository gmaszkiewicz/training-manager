// Shared by the specs that change the throwaway trainee's Settings → Components choices. Every spec shares the one
// trainee, so a spec that changes a choice restores the defaults afterwards and runs its tests serially.
import { expect, type Page } from "@playwright/test";

type ComponentKey =
  | "new-measurement"
  | "edit-measurement"
  | "measurements"
  | "find-trainee"
  | "trainee-measurements"
  | "progression"
  | "top-changes";

/** The registry defaults: every component at v1.0 except Top progression, which is off. */
export const DEFAULT_COMPONENTS: Record<ComponentKey, string> = {
  "new-measurement": "1.0",
  "edit-measurement": "1.0",
  measurements: "1.0",
  "find-trainee": "1.0",
  "trainee-measurements": "1.0",
  progression: "1.0",
  "top-changes": "off",
};

/** Every trainee component off, the module left on. */
export const TRAINEE_COMPONENTS_OFF: Partial<Record<ComponentKey, string>> = {
  "new-measurement": "off",
  "edit-measurement": "off",
  measurements: "off",
  progression: "off",
  "top-changes": "off",
};

/**
 * Saves choices through the same endpoint the Settings → Components form posts to. The endpoint merges the sent
 * fields over the stored ones, so only the named choices change.
 */
export async function saveComponents(
  page: Page,
  choices: { measurements?: boolean; components?: Partial<Record<ComponentKey, string>> },
): Promise<void> {
  const form: Record<string, string> = {};
  if (choices.measurements !== undefined) {
    form["module.measurements"] = choices.measurements ? "on" : "off";
  }
  for (const [id, value] of Object.entries(choices.components ?? {})) {
    form[`component.${id}`] = value;
  }
  const response = await page.request.post("/api/settings/components", {
    form,
    headers: { Accept: "application/json" },
  });
  expect(response.ok(), `saving components failed: ${String(response.status())} ${await response.text()}`).toBeTruthy();
}

/** Puts the module and every component back to the defaults. */
export async function restoreDefaultComponents(page: Page): Promise<void> {
  await saveComponents(page, { measurements: true, components: DEFAULT_COMPONENTS });
}
