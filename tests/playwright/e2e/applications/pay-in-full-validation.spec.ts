import { BrowserContext, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";
import { TEST_CONFIG } from "../../playwright.config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { continueToNextPage } from "../../utils/govuk-validators.js";
import {
  CLAIM_APPLICATION_REFERENCE,
  PAY_IN_FULL_MIXED_VAT_CLAIM_ID,
  PAY_IN_FULL_UNKNOWN_CODE_CLAIM_ID,
  PAY_IN_FULL_DISBURSEMENT_GROSS_CLAIM_ID,
  PAY_IN_FULL_DISBURSEMENT_GROSS_UPSTREAM_MESSAGE,
  PAY_IN_FULL_422_UNKNOWN_CODE_CLAIM_ID,
  PAY_IN_FULL_422_UNKNOWN_CODE_UPSTREAM_MESSAGE,
} from "#tests/playwright/factories/handlers/claimErrors.js";

const confirmProfitCostsLocale = en.pages.claimAssessment.confirmProfitCosts;
const confirmDisbursementCostsLocale =
  en.pages.claimAssessment.confirmDisbursementCosts;
const checkYourAnswersLocale = en.pages.claimAssessment.checkYourAnswers;
const errorSummaryTitle = en.components.errorSummary.title;

const profitNetTotal = "300";
const profitGrossTotal = "360";
const disbursementNetTotal = "500";
const disbursementGrossTotal = "600";

const walkToCheckYourAnswers = async (
  page: Page,
  assessClaimPage: string,
): Promise<void> => {
  await page.goto(assessClaimPage);
  const assessForm = page.getByTestId("assess-claim");
  await assessForm.getByRole("radio", { name: "Pay in full" }).check();
  await continueToNextPage(assessForm, page);

  const profitCostsForm = page.getByTestId("confirm-profit-costs");
  await profitCostsForm
    .getByLabel(confirmProfitCostsLocale.netLabel)
    .fill(profitNetTotal);
  await profitCostsForm
    .getByLabel(confirmProfitCostsLocale.grossLabel)
    .fill(profitGrossTotal);
  await continueToNextPage(profitCostsForm, page);

  const disbursementCostsForm = page.getByTestId("confirm-disbursement-costs");
  await disbursementCostsForm
    .getByLabel(confirmDisbursementCostsLocale.netLabel)
    .fill(disbursementNetTotal);
  await disbursementCostsForm
    .getByLabel(confirmDisbursementCostsLocale.grossLabel)
    .fill(disbursementGrossTotal);
  await continueToNextPage(disbursementCostsForm, page);
};

test.describe
  .serial("Pay in full validation errors on the check your answers page", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({ checkPageAccessibility }) => {
    await checkPageAccessibility(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("shows the mapped validation message and keeps the caseworker on the check your answers page", async () => {
    const assessClaimPage = `/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${PAY_IN_FULL_MIXED_VAT_CLAIM_ID}`;
    const checkYourAnswersPage = `${assessClaimPage}/check-your-answers`;

    await walkToCheckYourAnswers(sharedPage, assessClaimPage);
    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const form = sharedPage.getByTestId("check-your-answers");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByRole("heading", { name: errorSummaryTitle }),
    ).toBeVisible();
    await expect(
      errorSummary.getByText(
        confirmProfitCostsLocale.validationErrors.vatConflict,
      ),
    ).toBeVisible();

    await expect(
      sharedPage.getByRole("heading", {
        name: checkYourAnswersLocale.heading,
      }),
    ).toBeVisible();
  });
});

test.describe
  .serial("Pay in full validation errors with an unmapped error code", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({ checkPageAccessibility }) => {
    await checkPageAccessibility(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("shows the generic submission error and never surfaces the upstream message", async () => {
    const assessClaimPage = `/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${PAY_IN_FULL_UNKNOWN_CODE_CLAIM_ID}`;
    const checkYourAnswersPage = `${assessClaimPage}/check-your-answers`;

    await walkToCheckYourAnswers(sharedPage, assessClaimPage);
    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const form = sharedPage.getByTestId("check-your-answers");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByText(checkYourAnswersLocale.submissionError),
    ).toBeVisible();

    await expect(
      sharedPage.getByText(
        "An upstream validation message we should not surface",
      ),
    ).toHaveCount(0);
  });
});

test.describe
  .serial("Pay in full 422 validation errors on the check your answers page", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({ checkPageAccessibility }) => {
    await checkPageAccessibility(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("shows the mapped message for a 422 error code and never surfaces the upstream message", async () => {
    const assessClaimPage = `/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${PAY_IN_FULL_DISBURSEMENT_GROSS_CLAIM_ID}`;
    const checkYourAnswersPage = `${assessClaimPage}/check-your-answers`;

    await walkToCheckYourAnswers(sharedPage, assessClaimPage);
    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const form = sharedPage.getByTestId("check-your-answers");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByRole("heading", { name: errorSummaryTitle }),
    ).toBeVisible();
    await expect(
      errorSummary.getByText(
        confirmDisbursementCostsLocale.validationErrors.grossLessThanNet,
      ),
    ).toBeVisible();

    await expect(
      sharedPage.getByText(PAY_IN_FULL_DISBURSEMENT_GROSS_UPSTREAM_MESSAGE),
    ).toHaveCount(0);
    await expect(
      sharedPage.getByRole("heading", {
        name: checkYourAnswersLocale.heading,
      }),
    ).toBeVisible();
  });
});

test.describe
  .serial("Pay in full 422 validation errors with an unmapped error code", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({ checkPageAccessibility }) => {
    await checkPageAccessibility(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("shows the generic submission error for a 422 and never surfaces the upstream message", async () => {
    const assessClaimPage = `/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${PAY_IN_FULL_422_UNKNOWN_CODE_CLAIM_ID}`;
    const checkYourAnswersPage = `${assessClaimPage}/check-your-answers`;

    await walkToCheckYourAnswers(sharedPage, assessClaimPage);
    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const form = sharedPage.getByTestId("check-your-answers");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);

    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByText(checkYourAnswersLocale.submissionError),
    ).toBeVisible();

    await expect(
      sharedPage.getByText(PAY_IN_FULL_422_UNKNOWN_CODE_UPSTREAM_MESSAGE),
    ).toHaveCount(0);
  });
});
