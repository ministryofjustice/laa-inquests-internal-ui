import { BrowserContext, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";
import { TEST_CONFIG } from "../../playwright.config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  continueToNextPage,
  validateGovForm,
  validateGovPage,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";

const meritsLocale = en.pages.decision.merits;
const certificateStartDateLocale = en.pages.decision.certificateStartDate;
const confirmationLocale = en.pages.decision.confirmation;
const successLocale = en.pages.decision.success;
const overviewLocale = en.pages.applicationOverview;

const applicationId = "2";
const makeADecisionPage = `/applications/${applicationId}/decision`;
const overviewPage = `/applications/${applicationId}/overview`;
const successPage = `/applications/${applicationId}/decision/success`;
const certificateStartDatePage = `/applications/${applicationId}/decision/certificate-start-date`;
const checkYourAnswersPage = `/applications/${applicationId}/decision/confirmation`;
const certificateUrl = `/applications/${applicationId}/certificate`;

const startDate = { day: "1", month: "1", year: "2020" };
const formattedStartDate = "01 January 2020";

async function fillStartDate(
  page: Page,
  { day, month, year }: { day: string; month: string; year: string },
): Promise<void> {
  const form = page.getByTestId("certificate-start-date");
  await form.getByLabel("Day", { exact: true }).fill(day);
  await form.getByLabel("Month", { exact: true }).fill(month);
  await form.getByLabel("Year", { exact: true }).fill(year);
}

test.describe.serial("Grant application journey", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({ checkAccessibility }) => {
    await checkAccessibility();
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

  test("caseworker views the Certificate start date page with radio options", async () => {
    await validateGovPage(sharedPage, {
      headerText: certificateStartDateLocale.header,
      backUrl: makeADecisionPage,
    });

    const form = sharedPage.getByTestId("certificate-start-date");
    await validateGovForm(form, { action: certificateStartDatePage });

    await expect(form.getByRole("radio", { name: "Today" })).toBeVisible();
    await expect(
      form.getByRole("radio", { name: "Another date" }),
    ).toBeVisible();
  });

  test("caseworker sees no pre-selected option and date fields are hidden", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");

    await expect(form.getByRole("radio", { name: "Today" })).not.toBeChecked();
    await expect(
      form.getByRole("radio", { name: "Another date" }),
    ).not.toBeChecked();
  });

  test("caseworker sees no pre-populated date fields and they are hidden", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");

    await expect(form.getByLabel("Day", { exact: true })).toHaveValue("");
    await expect(form.getByLabel("Month", { exact: true })).toHaveValue("");
    await expect(form.getByLabel("Year", { exact: true })).toHaveValue("");

    await expect(form.getByLabel("Day", { exact: true })).not.toBeVisible();
    await expect(form.getByLabel("Month", { exact: true })).not.toBeVisible();
    await expect(form.getByLabel("Year", { exact: true })).not.toBeVisible();
  });

  test("caseworker sees a validation error when no option is selected", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(certificateStartDatePage);

    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link").first()).toHaveAttribute(
      "href",
      "#start-date-option",
    );
    await expect(form.locator(".govuk-error-message")).toBeVisible();
  });

  test("caseworker selects Another date and sees date input fields revealed", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");
    await form.getByRole("radio", { name: "Another date" }).check();

    // Date fields should now be visible
    await expect(form.getByLabel("Day", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Month", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Year", { exact: true })).toBeVisible();
  });

  test("caseworker sees a validation error when Another date is selected but fields are empty", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");
    await form.getByRole("radio", { name: "Another date" }).check();
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

  test("caseworker enters a valid date with Another date option and continues to confirmation page", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");
    await form.getByRole("radio", { name: "Another date" }).check();
    await fillStartDate(sharedPage, startDate);
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);
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

    // Verify "Another date" option is still selected
    await expect(
      form.getByRole("radio", { name: "Another date" }),
    ).toBeChecked();

    // Verify date fields are visible and pre-populated
    await expect(form.getByLabel("Day", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Day", { exact: true })).toHaveValue(
      startDate.day,
    );
    await expect(form.getByLabel("Month", { exact: true })).toHaveValue(
      startDate.month,
    );
    await expect(form.getByLabel("Year", { exact: true })).toHaveValue(
      startDate.year,
    );
  });

  test("caseworker selects Today and continues to confirmation page", async () => {
    const form = sharedPage.getByTestId("certificate-start-date");
    await form.getByRole("radio", { name: "Today" }).check();
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(checkYourAnswersPage);
  });

  test("caseworker sees today's date on the confirmation page", async () => {
    const form = sharedPage.getByTestId("check-your-answers");
    const summaryCard = form.locator(".govuk-summary-card");

    // Get today's date formatted as expected
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = today.toLocaleString("en-GB", { month: "long" });
    const year = today.getFullYear();
    const formattedToday = `${day} ${month} ${year}`;

    const startDateRow = summaryCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(confirmationLocale.certificateStartDateTitle, {
        exact: true,
      }),
    });
    await expect(startDateRow.getByText(formattedToday)).toBeVisible();
  });

  test("caseworker clicks Change and sees Today option still selected", async () => {
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

    const dateForm = sharedPage.getByTestId("certificate-start-date");
    await expect(dateForm.getByRole("radio", { name: "Today" })).toBeChecked();

    await continueToNextPage(dateForm, sharedPage);
    await expect(sharedPage).toHaveURL(checkYourAnswersPage);
  });

  test("caseworker submits the decision and is taken to the success page", async () => {
    const form = sharedPage.getByTestId("check-your-answers");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(successPage);
    await expect(
      sharedPage.getByRole("heading", { name: successLocale.header }),
    ).toBeVisible();
    await expect(
      sharedPage.getByText(successLocale.referenceLabel),
    ).toBeVisible();
    await expect(
      sharedPage.getByText(applicationId, { exact: true }),
    ).toBeVisible();
    await expect(
      sharedPage.getByRole("heading", { name: successLocale.whatHappensNext }),
    ).toBeVisible();
    await expect(
      sharedPage.getByText(successLocale.whatHappensNextBody),
    ).toBeVisible();
    const button = await sharedPage.getByRole("button", {
      name: successLocale.applicationOverviewReturnButton,
    });
    await expect(button).toHaveAttribute("href", overviewPage);
  });

  test("caseworker views certificate link", async ({ page }) => {
    const button = await sharedPage.getByRole("button", {
      name: successLocale.applicationOverviewReturnButton,
    });
    await button.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(sharedPage).toHaveURL(overviewPage);

    const viewCertificateLink = await sharedPage.getByRole("link", {
      name: overviewLocale.details.viewCertificate,
    });

    await expect(viewCertificateLink).toBeVisible();
    await viewCertificateLink.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(sharedPage).toHaveURL(certificateUrl);
  });
});
