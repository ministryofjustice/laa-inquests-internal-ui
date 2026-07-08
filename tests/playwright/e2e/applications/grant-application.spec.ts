import { BrowserContext, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";
import { TEST_CONFIG } from "../../playwright.config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  continueToNextPage,
  validateCSRFToken,
  validateGovForm,
  validateGovPage,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";

const meritsLocale = en.pages.decision.merits;
const certificateStartDateLocale = en.pages.decision.certificateStartDate;
const confirmationLocale = en.pages.decision.confirmation;

const applicationId = "1";
const makeADecisionPage = `/applications/${applicationId}/decision`;
const overviewPage = `/applications/${applicationId}/overview`;
const certificateStartDatePage = `/applications/${applicationId}/decision/certificate-start-date`;
const confirmationPage = `/applications/${applicationId}/decision/confirmation`;

const startDate = { day: "1", month: "1", year: "2020" };
const formattedStartDate = "1 Jan 2020";

async function fillStartDate(
  page: Page,
  { day, month, year }: { day: string; month: string; year: string },
): Promise<void> {
  const form = page.getByTestId("certificate-start-date");
  await form.getByLabel("Day").fill(day);
  await form.getByLabel("Month").fill(month);
  await form.getByLabel("Year").fill(year);
}

test.describe.serial("Grant application journey", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
    await sharedPage.request.get("/test/auth-session");
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("caseworker selects Grant and continues to certificate start date page", async () => {
    await sharedPage.goto(makeADecisionPage);

    const form = sharedPage.getByTestId("make-a-decision");
    await form
      .getByRole("radio", { name: meritsLocale.radio.grantLabel })
      .check();
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(certificateStartDatePage);
  });

  test("caseworker views the Certificate start date page", async () => {
    await validateGovPage(sharedPage, {
      headerText: certificateStartDateLocale.header,
      backUrl: makeADecisionPage,
    });

    const form = sharedPage.getByTestId("certificate-start-date");
    await validateGovForm(form, { action: certificateStartDatePage });

    await expect(form.getByLabel("Day")).toBeVisible();
    await expect(form.getByLabel("Month")).toBeVisible();
    await expect(form.getByLabel("Year")).toBeVisible();
  });

  test("caseworker sees a validation error when the date is invalid", async () => {
    // Exact per-case messages (empty, future, not a real date) are covered by
    // the validator unit tests. Here we only assert an error is surfaced.
    const form = sharedPage.getByTestId("certificate-start-date");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(certificateStartDatePage);

    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link").first()).toHaveAttribute(
      "href",
      "#start-date",
    );
    await expect(form.locator(".govuk-error-message")).toBeVisible();
  });

  test("caseworker enters a valid date and continues to confirmation page", async () => {
    await fillStartDate(sharedPage, startDate);
    const form = sharedPage.getByTestId("certificate-start-date");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(confirmationPage);
  });

  test("caseworker views the Check your answers page for a grant", async () => {
    await validateGovPage(sharedPage, {
      headerText: confirmationLocale.header,
      backUrl: certificateStartDatePage,
    });

    const form = sharedPage.getByTestId("check-your-answers");
    const summaryCard = form.locator(".govuk-summary-card");
    const cardTitle = summaryCard.locator(".govuk-summary-card__title");
    await expect(cardTitle).toHaveText(confirmationLocale.cardTitle);

    const meritsAssessmentRow = summaryCard.locator(
      ".govuk-summary-list__row",
      {
        has: sharedPage.getByText(confirmationLocale.meritsAssessmentTitle, {
          exact: true,
        }),
      },
    );
    await expect(
      meritsAssessmentRow.getByText("Granted", { exact: true }),
    ).toBeVisible();
    await expect(
      meritsAssessmentRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", makeADecisionPage);

    const startDateRow = summaryCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(confirmationLocale.certificateStartDateTitle, {
        exact: true,
      }),
    });
    await expect(startDateRow.getByText(formattedStartDate)).toBeVisible();
    await expect(
      startDateRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", certificateStartDatePage);

    await validateSubmitButton(form, confirmationLocale.submitButton);
  });

  test("caseworker clicks Change on the certificate start date row and returns to the date page", async () => {
    const form = sharedPage.getByTestId("check-your-answers");
    const summaryCard = form.locator(".govuk-summary-card");

    const startDateRow = summaryCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(confirmationLocale.certificateStartDateTitle, {
        exact: true,
      }),
    });
    await startDateRow.getByRole("link", { name: /change/i }).click();
    await sharedPage.waitForLoadState("domcontentloaded");

    await expect(sharedPage).toHaveURL(certificateStartDatePage);
  });

  test("caseworker sees pre-populated data on the certificate start date page", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");

    await expect(form.getByLabel("Day")).toHaveValue(startDate.day);
    await expect(form.getByLabel("Month")).toHaveValue(startDate.month);
    await expect(form.getByLabel("Year")).toHaveValue(startDate.year);
  });
});
