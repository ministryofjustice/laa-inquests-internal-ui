import { expect, test } from "../../fixtures/index.js";
import {
  validateGovForm,
  validateGovPage,
} from "../../utils/govuk-validators.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const disbursementCostsLocale = en.pages.disbursementCosts;
const validationErrors = disbursementCostsLocale.validationErrors;

const applicationId = "5";
const claimId = "10";
const disbursementCostsPage = `/applications/${applicationId}/claims/${claimId}/disbursement-costs`;
const claimAssessmentPage = `/applications/${applicationId}/claims/${claimId}`;

const vatZeroField = "disbursement-cost-vat-zero";
const netField = "disbursement-cost-net";
const grossField = "disbursement-cost-gross";

async function submitForm(
  form: import("playwright").Locator,
  page: import("playwright").Page,
): Promise<void> {
  await form
    .getByRole("button", { name: disbursementCostsLocale.continue })
    .click();
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Confirm disbursement costs page", () => {
  test("renders the disbursement costs form", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(disbursementCostsPage);

    await validateGovPage(page, {
      headerText: disbursementCostsLocale.heading,
      backUrl: claimAssessmentPage,
    });

    await expect(page.getByText(disbursementCostsLocale.intro)).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 3,
        name: disbursementCostsLocale.vatZero.heading,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: disbursementCostsLocale.vat20.heading,
      }),
    ).toBeVisible();

    const form = page.getByTestId("disbursement-costs");
    await validateGovForm(form, { action: disbursementCostsPage });

    await expect(
      form.getByLabel(disbursementCostsLocale.vatZero.label),
    ).toBeVisible();
    await expect(
      form.getByLabel(disbursementCostsLocale.net.label),
    ).toBeVisible();
    await expect(
      form.getByLabel(disbursementCostsLocale.gross.label),
    ).toBeVisible();

    await expect(
      form.getByText(disbursementCostsLocale.net.hint),
    ).toBeVisible();
    await expect(
      form.getByText(disbursementCostsLocale.gross.hint),
    ).toBeVisible();
    await expect(form.locator(".govuk-input__prefix").first()).toHaveText("£");

    await checkAccessibility();
  });

  test("redirects to the claim assessment page when all costs are valid", async ({
    page,
  }) => {
    await page.goto(disbursementCostsPage);
    const form = page.getByTestId("disbursement-costs");

    await form.getByLabel(disbursementCostsLocale.vatZero.label).fill("100");
    await form.getByLabel(disbursementCostsLocale.net.label).fill("200.50");
    await form.getByLabel(disbursementCostsLocale.gross.label).fill("240.60");

    await submitForm(form, page);

    await expect(page).toHaveURL(claimAssessmentPage);
  });

  test("shows validation errors when all costs are empty", async ({ page }) => {
    await page.goto(disbursementCostsPage);
    const form = page.getByTestId("disbursement-costs");

    await submitForm(form, page);

    await expect(page).toHaveURL(disbursementCostsPage);

    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByRole("link", {
        name: validationErrors.vatZero.notEmpty,
      }),
    ).toHaveAttribute("href", `#${vatZeroField}`);
    await expect(
      errorSummary.getByRole("link", { name: validationErrors.net.notEmpty }),
    ).toHaveAttribute("href", `#${netField}`);
    await expect(
      errorSummary.getByRole("link", { name: validationErrors.gross.notEmpty }),
    ).toHaveAttribute("href", `#${grossField}`);
  });

  test("shows an invalid format error for non-numeric input", async ({
    page,
  }) => {
    await page.goto(disbursementCostsPage);
    const form = page.getByTestId("disbursement-costs");

    await form.getByLabel(disbursementCostsLocale.vatZero.label).fill("abc");
    await form.getByLabel(disbursementCostsLocale.net.label).fill("100");
    await form.getByLabel(disbursementCostsLocale.gross.label).fill("120");

    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.vatZero.invalid,
      }),
    ).toBeVisible();
  });

  test("shows an invalid format error for more than two decimal places", async ({
    page,
  }) => {
    await page.goto(disbursementCostsPage);
    const form = page.getByTestId("disbursement-costs");

    await form.getByLabel(disbursementCostsLocale.vatZero.label).fill("100");
    await form.getByLabel(disbursementCostsLocale.net.label).fill("100");
    await form.getByLabel(disbursementCostsLocale.gross.label).fill("120.555");

    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.gross.invalid,
      }),
    ).toBeVisible();
  });

  test("shows a negative amount error for a negative input", async ({
    page,
  }) => {
    await page.goto(disbursementCostsPage);
    const form = page.getByTestId("disbursement-costs");

    await form.getByLabel(disbursementCostsLocale.vatZero.label).fill("100");
    await form.getByLabel(disbursementCostsLocale.net.label).fill("-50");
    await form.getByLabel(disbursementCostsLocale.gross.label).fill("120");

    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.net.negative,
      }),
    ).toBeVisible();
  });

  test("retains entered values when validation fails", async ({ page }) => {
    await page.goto(disbursementCostsPage);
    const form = page.getByTestId("disbursement-costs");

    await form.getByLabel(disbursementCostsLocale.vatZero.label).fill("150");
    await form.getByLabel(disbursementCostsLocale.net.label).fill("250.75");

    await submitForm(form, page);

    await expect(page).toHaveURL(disbursementCostsPage);
    await expect(
      form.getByLabel(disbursementCostsLocale.vatZero.label),
    ).toHaveValue("150");
    await expect(
      form.getByLabel(disbursementCostsLocale.net.label),
    ).toHaveValue("250.75");
  });
});
