import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";
import { MISSING_CLAIM_REFERENCE } from "#tests/playwright/factories/handlers/claimErrors.js";

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
    await expect(page.getByText("For example: INQC-Y68H-4H2A")).toBeVisible();
  });

  test("renders continue button to the right of the input", async ({
    page,
  }) => {
    const form = page.getByTestId("claim-search-form");
    const continueButton = form.getByRole("button", { name: "Continue" });

    await expect(continueButton).toBeVisible();
    await expect(continueButton).toHaveAttribute("type", "submit");
  });

  test("displays error message for invalid reference", async ({ page }) => {
    const form = page.getByTestId("claim-search-form");
    const input = form.getByLabel("Enter the claim reference number");

    await input.fill("INQ-REA-ELzd");

    const continueButton = form.getByRole("button", { name: "Continue" });

    await continueButton.click();

    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link").first()).toHaveAttribute(
      "href",
      "#claim-reference",
    );
    await expect(form.locator(".govuk-error-message")).toBeVisible();
  });

  test("displays error message for missing reference", async ({ page }) => {
    const form = page.getByTestId("claim-search-form");
    const input = form.getByLabel("Enter the claim reference number");

    await input.fill("");

    const continueButton = form.getByRole("button", { name: "Continue" });

    await continueButton.click();

    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link").first()).toHaveAttribute(
      "href",
      "#claim-reference",
    );
    await expect(form.locator(".govuk-error-message")).toBeVisible();
  });

  test("returns a not found response when the claim reference does not exist", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/claims/search",
    );

    await page
      .getByLabel("Enter the claim reference number")
      .fill(MISSING_CLAIM_REFERENCE);
    await page.getByRole("button", { name: "Continue" }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(404);
  });
});
