import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";

test.describe("Application Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications/search");
  });

  test("should have the correct title and back link", async ({
    page,
    checkAccessibility,
  }) => {
    await expect(page).toHaveTitle(
      "Search for Application – Inquests – GOV.UK",
    );

    const headerText = "Search for an application or certificate";
    await validateGovPage(page, { headerText: headerText, backUrl: "/" });

    await checkAccessibility();
  });

  test("renders application input with label", async ({ page }) => {
    const form = page.getByTestId("application-search-form");

    await expect(form).toBeVisible();
    await expect(form.getByLabel("Enter a legal aid reference")).toBeVisible();
  });

  test("renders continue button to the right of the input", async ({
    page,
  }) => {
    const form = page.getByTestId("application-search-form");
    const continueButton = form.getByRole("button", { name: "Continue" });

    await expect(continueButton).toBeVisible();
    await expect(continueButton).toHaveAttribute("type", "submit");
  });
});
