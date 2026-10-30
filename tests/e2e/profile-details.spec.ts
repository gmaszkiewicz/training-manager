// Details tab: a signed-in trainee sees a read-only, unsubmitted Role field reading "Trainee" above Email.
import { expect, test } from "@playwright/test";

test("the Details tab shows the trainee's role read-only above Email", async ({ page }) => {
  // The first /measurements visit creates the profile row a fresh trainee needs.
  await page.goto("/measurements");
  await page.goto("/profile");
  await expect(page.getByRole("tab", { name: "Details", selected: true })).toBeVisible();

  const role = page.getByLabel("Role", { exact: true });
  const email = page.getByLabel("Email", { exact: true });

  await expect(role).toHaveValue("Trainee");
  await expect(role).toHaveAttribute("readonly");
  await expect(role).not.toHaveAttribute("name");
  await expect(email).toBeVisible();

  // Role sits above Email.
  const roleBox = await role.boundingBox();
  const emailBox = await email.boundingBox();
  if (roleBox === null || emailBox === null) {
    throw new Error("missing bounding box");
  }
  expect(roleBox.y).toBeLessThan(emailBox.y);
});
