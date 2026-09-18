import { test, expect } from "../fixtures/index.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

test.describe("User roles page", () => {
  test("displays User roles heading and warning", async ({ page }) => {
    await page.goto("/user-roles");

    await expect(
      page.getByRole("heading", { name: "User roles" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "This page is not production ready and is intended for developers.",
      ),
    ).toBeVisible();
  });

  test("display user roles page table", async ({ page }) => {
    await page.goto("/user-roles");

    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row", { name: /Role name/i })).toBeVisible();
  });

  test("displays true for assigned roles", async ({ page }) => {
    await page.goto("/user-roles");

    const applicationCaseWorkerRole =
      INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER;
    let row = page.getByRole("row", {
      name: new RegExp(applicationCaseWorkerRole, "i"),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText("true");
  });

  test("displays false for unassigned roles", async ({ page }) => {
    await page.goto(`/auth/test-login?overrideRoles=true`);
    await page.goto("/user-roles");

    const claimsCaseWorkerRole = INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER;
    let row = page.getByRole("row", {
      name: new RegExp(claimsCaseWorkerRole, "i"),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText("false");
  });
});
