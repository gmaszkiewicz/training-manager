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

  // Role comes before Email in document order.
  const roleHandle = await role.elementHandle();
  const precedesEmail = await email.evaluate(
    (emailInput, roleInput) =>
      Boolean(emailInput.compareDocumentPosition(roleInput) & Node.DOCUMENT_POSITION_PRECEDING),
    roleHandle,
  );
  expect(precedesEmail).toBe(true);
});
