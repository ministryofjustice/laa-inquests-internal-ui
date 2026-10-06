import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";

test.describe("Application Search", () => {
  test("should have the correct title and back link", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto("/applications/search");

    await expect(page).toHaveTitle(
      "Search for Application – Inquests – GOV.UK",
    );

    const headerText = "Search for an application or certificate";
    await validateGovPage(page, { headerText: headerText, backUrl: "/" });

    await checkAccessibility();
  });
});
