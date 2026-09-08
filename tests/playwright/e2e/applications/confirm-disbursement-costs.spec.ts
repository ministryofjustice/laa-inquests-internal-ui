import type { Locator, Page } from "playwright";
import { expect, test } from "../../fixtures/index.js";
import {
  validateBackButton,
  validateCSRFToken,
  validateFormAttributes,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const confirmDisbursementCostsLocale =
  en.pages.claimAssessment.confirmDisbursementCosts;
const validationErrors = confirmDisbursementCostsLocale.validationErrors;

const applicationId = "5";
const claimId = "10";
const assessClaimPage = `/applications/${applicationId}/claims/${claimId}`;
const confirmProfitCostsPage = `${assessClaimPage}/confirm-profit-costs`;
const confirmDisbursementCostsPage = `${assessClaimPage}/confirm-disbursement-costs`;

async function setTotals(
  form: Locator,
  { net = "", gross = "", zeroVat = "" }: Partial<Record<string, string>> = {},
): Promise<void> {
  await form.getByLabel(confirmDisbursementCostsLocale.netLabel).fill(net);
  await form.getByLabel(confirmDisbursementCostsLocale.grossLabel).fill(gross);
  await form.getByLabel(confirmDisbursementCostsLocale.zeroLabel).fill(zeroVat);
}

async function submitForm(form: Locator, page: Page): Promise<void> {
  await form
    .getByRole("button", { name: confirmDisbursementCostsLocale.continue })
    .click();
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Confirm the total disbursement costs page", () => {
  test("renders the confirm disbursement costs form", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(confirmDisbursementCostsPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: confirmDisbursementCostsLocale.heading,
      }),
    ).toBeVisible();

    await expect(
      page.getByText(confirmDisbursementCostsLocale.intro1),
    ).toBeVisible();
    await expect(
      page.getByText(confirmDisbursementCostsLocale.intro2),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: confirmDisbursementCostsLocale.vat20Heading,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: confirmDisbursementCostsLocale.vat0Heading,
      }),
    ).toBeVisible();

    const form = page.getByTestId("confirm-disbursement-costs");
    await validateFormAttributes(form, confirmDisbursementCostsPage);
    await validateCSRFToken(form);

    await expect(
      form.getByLabel(confirmDisbursementCostsLocale.netLabel),
    ).toBeVisible();
    await expect(
      form.getByLabel(confirmDisbursementCostsLocale.grossLabel),
    ).toBeVisible();
    await expect(
      form.getByLabel(confirmDisbursementCostsLocale.zeroLabel),
    ).toBeVisible();

    await validateSubmitButton(form, confirmDisbursementCostsLocale.continue);
    await validateBackButton(page, confirmProfitCostsPage);

    await checkAccessibility();
  });

  test("shows a summary error when all totals are empty", async ({ page }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form);
    await submitForm(form, page);

    await expect(page).toHaveURL(confirmDisbursementCostsPage);
    const errorSummary = page.locator(".govuk-error-summary");
    await expect(
      errorSummary.getByRole("link", {
        name: validationErrors.totalRequired,
      }),
    ).toHaveAttribute("href", "#net-total");
  });

  test("shows the net missing error when only the gross total is filled in", async ({
    page,
  }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { gross: "360" });
    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.netMissing,
      }),
    ).toBeVisible();
  });

  test("shows the gross missing error when only the net total is filled in", async ({
    page,
  }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { net: "300" });
    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.grossMissing,
      }),
    ).toBeVisible();
  });

  test("shows a format error for a non-numeric value", async ({ page }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { net: "abc", gross: "360" });
    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.netFormat,
      }),
    ).toBeVisible();
  });

  test("shows the gross-not-greater-than-net error when gross is not more than net", async ({
    page,
  }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { net: "400", gross: "360" });
    await submitForm(form, page);

    await expect(
      form.locator(".govuk-error-message", {
        hasText: validationErrors.grossNotGreaterThanNet,
      }),
    ).toBeVisible();
  });

  test("redirects to the claim assessment page when net and gross totals are valid", async ({
    page,
  }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { net: "300", gross: "360" });
    await submitForm(form, page);

    await expect(page).toHaveURL(assessClaimPage);
  });

  test("redirects to the claim assessment page when only the 0% VAT total is valid", async ({
    page,
  }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { zeroVat: "100.50" });
    await submitForm(form, page);

    await expect(page).toHaveURL(assessClaimPage);
  });

  test("allows a nil bill where the net and gross totals are both 0", async ({
    page,
  }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { net: "0", gross: "0" });
    await submitForm(form, page);

    await expect(page).toHaveURL(assessClaimPage);
  });

  test("retains entered values when validation fails", async ({ page }) => {
    await page.goto(confirmDisbursementCostsPage);
    const form = page.getByTestId("confirm-disbursement-costs");

    await setTotals(form, { net: "400", gross: "360" });
    await submitForm(form, page);

    await expect(page).toHaveURL(confirmDisbursementCostsPage);
    await expect(
      form.getByLabel(confirmDisbursementCostsLocale.netLabel),
    ).toHaveValue("400");
    await expect(
      form.getByLabel(confirmDisbursementCostsLocale.grossLabel),
    ).toHaveValue("360");
  });
});
