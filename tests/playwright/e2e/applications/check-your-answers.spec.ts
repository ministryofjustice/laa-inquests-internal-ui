import { BrowserContext, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";
import { TEST_CONFIG } from "../../playwright.config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  continueToNextPage,
  validateCSRFToken,
  validateGovPage,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";

const checkYourAnswersLocale = en.pages.claimAssessment.checkYourAnswers;
const confirmProfitCostsLocale = en.pages.claimAssessment.confirmProfitCosts;
const confirmDisbursementCostsLocale =
  en.pages.claimAssessment.confirmDisbursementCosts;

const applicationId = "INQ-YYY-005";
const claimId = "10";
const assessClaimPage = `/applications/${applicationId}/claims/${claimId}`;
const confirmProfitCostsPage = `${assessClaimPage}/confirm-profit-costs`;
const confirmDisbursementCostsPage = `${assessClaimPage}/confirm-disbursement-costs`;
const checkYourAnswersPage = `${assessClaimPage}/check-your-answers`;

const profitNetTotal = "300";
const profitGrossTotal = "360";
const disbursementNetTotal = "500";
const disbursementGrossTotal = "600";

test.describe.serial("Check your answers page", () => {
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

  test("caseworker enters profit and disbursement costs and reaches the check your answers page", async () => {
    await sharedPage.goto(assessClaimPage);
    const assessForm = sharedPage.getByTestId("assess-claim");
    await assessForm.getByRole("radio", { name: "Pay in full" }).check();
    await continueToNextPage(assessForm, sharedPage);

    await expect(sharedPage).toHaveURL(confirmProfitCostsPage);

    const profitCostsForm = sharedPage.getByTestId("confirm-profit-costs");
    await profitCostsForm
      .getByLabel(confirmProfitCostsLocale.netLabel)
      .fill(profitNetTotal);
    await profitCostsForm
      .getByLabel(confirmProfitCostsLocale.grossLabel)
      .fill(profitGrossTotal);
    await continueToNextPage(profitCostsForm, sharedPage);

    await expect(sharedPage).toHaveURL(confirmDisbursementCostsPage);

    const disbursementCostsForm = sharedPage.getByTestId(
      "confirm-disbursement-costs",
    );
    await disbursementCostsForm
      .getByLabel(confirmDisbursementCostsLocale.netLabel)
      .fill(disbursementNetTotal);
    await disbursementCostsForm
      .getByLabel(confirmDisbursementCostsLocale.grossLabel)
      .fill(disbursementGrossTotal);
    await continueToNextPage(disbursementCostsForm, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);
  });

  test("caseworker views claim details, profit costs and disbursement costs on the check your answers page", async () => {
    await validateGovPage(sharedPage, {
      headerText: checkYourAnswersLocale.heading,
      backUrl: assessClaimPage,
    });

    const form = sharedPage.getByTestId("check-your-answers");
    const cards = form.locator(".govuk-summary-card");
    await expect(cards).toHaveCount(3);

    const claimDetailsCard = cards.filter({
      has: sharedPage.locator(".govuk-summary-card__title", {
        hasText: checkYourAnswersLocale.claimDetailsCardTitle,
      }),
    });
    const finalBillRow = claimDetailsCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(checkYourAnswersLocale.finalBillTitle, {
        exact: true,
      }),
    });
    await expect(finalBillRow.getByText("£1,200")).toBeVisible();
    await expect(
      finalBillRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", assessClaimPage);

    const claimDecisionsRow = claimDetailsCard.locator(
      ".govuk-summary-list__row",
      {
        has: sharedPage.getByText(checkYourAnswersLocale.claimDecisionsTitle, {
          exact: true,
        }),
      },
    );
    await expect(claimDecisionsRow.getByText("Pay in full")).toBeVisible();
    await expect(
      claimDecisionsRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", `${assessClaimPage}?from=check-your-answers`);

    const profitCostsCard = cards.filter({
      has: sharedPage.locator(".govuk-summary-card__title", {
        hasText: checkYourAnswersLocale.profitCostsCardTitle,
      }),
    });
    const profitNetRow = profitCostsCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(checkYourAnswersLocale.netTotalTitle, {
        exact: true,
      }),
    });
    await expect(profitNetRow.getByText("£300")).toBeVisible();
    await expect(
      profitNetRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", confirmProfitCostsPage);

    const profitGrossRow = profitCostsCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(checkYourAnswersLocale.grossTotalTitle, {
        exact: true,
      }),
    });
    await expect(profitGrossRow.getByText("£360")).toBeVisible();

    const profitZeroVatRow = profitCostsCard.locator(
      ".govuk-summary-list__row",
      {
        has: sharedPage.getByText(checkYourAnswersLocale.zeroVatTotalTitle, {
          exact: true,
        }),
      },
    );
    await expect(
      profitZeroVatRow.getByText("-", { exact: true }),
    ).toBeVisible();

    const disbursementCostsCard = cards.filter({
      has: sharedPage.locator(".govuk-summary-card__title", {
        hasText: checkYourAnswersLocale.disbursementCostsCardTitle,
      }),
    });
    const disbursementNetRow = disbursementCostsCard.locator(
      ".govuk-summary-list__row",
      {
        has: sharedPage.getByText(checkYourAnswersLocale.netTotalTitle, {
          exact: true,
        }),
      },
    );
    await expect(disbursementNetRow.getByText("£500")).toBeVisible();
    await expect(
      disbursementNetRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", confirmDisbursementCostsPage);

    const disbursementGrossRow = disbursementCostsCard.locator(
      ".govuk-summary-list__row",
      {
        has: sharedPage.getByText(checkYourAnswersLocale.grossTotalTitle, {
          exact: true,
        }),
      },
    );
    await expect(disbursementGrossRow.getByText("£600")).toBeVisible();

    await validateSubmitButton(form, checkYourAnswersLocale.finishButton);
  });

  test("check your answers page form contains a CSRF token", async () => {
    const form = sharedPage.getByTestId("check-your-answers");
    await validateCSRFToken(form);
  });

  test("caseworker clicks Finish assessing claim and remains on the check your answers page", async () => {
    const form = sharedPage.getByTestId("check-your-answers");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);
    await expect(
      sharedPage.getByRole("heading", {
        level: 1,
        name: checkYourAnswersLocale.heading,
      }),
    ).toBeVisible();
  });
});
