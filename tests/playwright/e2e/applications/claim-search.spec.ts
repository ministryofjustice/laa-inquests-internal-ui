import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";

test.describe("Claim Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/claims/search");
  });

  test("should have the correct title and back link", async ({
    page,
    checkAccessibility,
  }) => {
    await expect(page).toHaveTitle("Search for a claim – Inquests – GOV.UK");

    const headerText = "Search for a claim";
    await validateGovPage(page, { headerText: headerText, backUrl: "/" });

    await checkAccessibility();
  });

  test("renders application input with label", async ({ page }) => {
    const form = page.getByTestId("claim-search-form");

    await expect(form).toBeVisible();
    await expect(
      form.getByLabel("Enter the claim reference number"),
    ).toBeVisible();
    await expect(page.getByText("For example: INQC-Y68H-4H2")).toBeVisible();
  });
});
