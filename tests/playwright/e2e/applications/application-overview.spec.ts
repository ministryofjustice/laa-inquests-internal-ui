import { test, expect } from "../../fixtures/index.js";


test.describe("Application overview page", () => {

  test("application overview page should have the correct title and back link", async ({ page }) => {

    const applicationId = "1";
    await page.goto(`/applications/${applicationId}/overview`);
    const backButton = page.getByRole("link", { name: "Back", exact: true });
    const applicationHeading = await page.getByRole("heading", {
      level: 1,
      name: applicationId,
    });

    await expect(page).toHaveTitle(/Inquests – GOV.UK/);
    await expect(applicationHeading).toBeVisible();
    await expect(backButton).toBeVisible();
    await expect(backButton).toHaveAttribute(
      "href",
      "#",
    );
  });

  test("application overview page should have tabs", async ({ page }) => {
    const applicationId = "1237634";
    await page.goto(`/applications/${applicationId}/overview`);

    await expect(page.getByRole("tab", { name: "Applicaition details" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "People" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History" })).toBeVisible();
  });

});
