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
const justificationLocale = en.pages.decision.justification;
const confirmationLocale = en.pages.decision.confirmation;
const successLocale = en.pages.decision.success;

const applicationId = "1";
const makeADecisionPage = `/applications/${applicationId}/decision`;
const overviewPage = `/applications/${applicationId}/overview`;
const justificationPage = `/applications/${applicationId}/decision/justification`;
const confirmationPage = `/applications/${applicationId}/decision/confirmation`;
const successPage = `/applications/${applicationId}/decision/success`;
const justificationText = "Test note";

test.describe.serial("Refuse application journey", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("caseworker views the Make a decision page", async () => {
    await sharedPage.goto(makeADecisionPage);

    const form = sharedPage.getByTestId("make-a-decision");

    await validateGovPage(sharedPage, {
      headerText: meritsLocale.header,
      backUrl: overviewPage,
    });
    await validateGovForm(form, { action: makeADecisionPage });

    const referenceLabel = form.getByRole("heading", {
      name: applicationId,
      level: 2,
    });
    await expect(referenceLabel).toBeVisible();

    const paragraphText = meritsLocale.extraDetail;
    await expect(form.getByText(paragraphText)).toBeVisible();

    const firstCard = form.locator(".govuk-summary-card").filter({
      has: sharedPage.getByRole("heading", {
        name: meritsLocale.proceedingsOverview.title,
      }),
    });
    await expect(
      firstCard.getByText(
        meritsLocale.proceedingsOverview.certificateTypeTitle,
      ),
    ).toBeVisible();
    await expect(firstCard.getByText("Substantive")).toBeVisible();
    await expect(
      firstCard.getByText(
        meritsLocale.proceedingsOverview.meritsAssessmentTitle,
      ),
    ).toBeVisible();
    //await expect(firstCard.getByText("Refused")).toBeVisible();

    await expect(form.getByText(meritsLocale.radio.label)).toBeVisible();
    await expect(
      form.getByRole("radio", { name: meritsLocale.radio.grantLabel }),
    ).toBeVisible();
    await expect(
      form.getByRole("radio", { name: meritsLocale.radio.refuseLabel }),
    ).toBeVisible();
  });

  test("caseworker sees validation error when no overall decision selected", async () => {
    await sharedPage.goto(makeADecisionPage);

    const form = sharedPage.getByTestId("make-a-decision");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(makeADecisionPage);
    const errorMessage = form.locator(".govuk-error-message", {
      hasText: meritsLocale.radio.validationError.notEmpty,
    });
    await expect(errorMessage).toBeVisible();
  });

  test("caseworker selects Refuse and continues to justification page", async () => {
    const form = sharedPage.getByTestId("make-a-decision");
    await form
      .getByRole("radio", { name: meritsLocale.radio.refuseLabel })
      .check();
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(justificationPage);
  });

  test("caseworker views the Select a reason for refusal page", async () => {
    await validateGovPage(sharedPage, {
      headerText: justificationLocale.header,
      backUrl: makeADecisionPage,
    });

    const form = sharedPage.getByTestId("select-reason-for-refusal");
    await validateGovForm(form, { action: justificationPage });

    await expect(form.getByText(justificationLocale.radio.label)).toBeVisible();
    await expect(
      form.getByRole("radio", { name: justificationLocale.radio.notInScope }),
    ).toBeVisible();
    await expect(
      form.getByRole("radio", {
        name: justificationLocale.radio.insufficientInformation,
      }),
    ).toBeVisible();
    await expect(
      form.getByRole("radio", {
        name: justificationLocale.radio.duplicateCase,
      }),
    ).toBeVisible();

    await expect(
      form.getByLabel(justificationLocale.textarea.label),
    ).toBeVisible();
  });

  test("caseworker sees validation errors when no reason selected and justification not provided", async () => {
    const form = sharedPage.getByTestId("select-reason-for-refusal");
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(justificationPage);
    const errorMessage = form.locator(".govuk-error-message", {
      hasText: justificationLocale.radio.validationErrors.notEmpty,
    });
    await expect(errorMessage).toBeVisible();
  });

  test("caseworker selects a reason and continues to confirmation page", async () => {
    const form = sharedPage.getByTestId("select-reason-for-refusal");
    await form
      .getByRole("radio", { name: justificationLocale.radio.notInScope })
      .check();
    await form
      .getByLabel(justificationLocale.textarea.label)
      .fill(justificationText);
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(confirmationPage);
  });

  test("caseworker views the Check your answers page", async () => {
    await validateGovPage(sharedPage, {
      headerText: confirmationLocale.header,
      backUrl: justificationPage,
    });

    const form = sharedPage.getByTestId("check-your-answers");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", confirmationPage);
    await validateCSRFToken(form);

    const summaryCard = form.locator(".govuk-summary-card");
    const cardTitle = summaryCard.locator(".govuk-summary-card__title");
    await expect(cardTitle).toHaveText(confirmationLocale.cardTitle);

    await expect(
      summaryCard.getByText(confirmationLocale.certificateTypeTitle),
    ).toBeVisible();
    await expect(summaryCard.getByText("Substantive")).toBeVisible();

    const meritsAssessmentRow = summaryCard.locator(
      ".govuk-summary-list__row",
      {
        has: sharedPage.getByText(confirmationLocale.meritsAssessmentTitle, {
          exact: true,
        }),
      },
    );
    await expect(
      meritsAssessmentRow.getByText(meritsLocale.radio.refuseLabel, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      meritsAssessmentRow.getByRole("link", { name: /change/i }),
    ).toHaveAttribute("href", makeADecisionPage);

    await expect(
      summaryCard.getByText(confirmationLocale.refusalReasonTitle, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      summaryCard.getByText(justificationLocale.radio.notInScope),
    ).toBeVisible();
    await expect(
      summaryCard.getByText(confirmationLocale.justificationTitle, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(summaryCard.getByText(justificationText)).toBeVisible();

    await validateSubmitButton(form, confirmationLocale.submitButton);
  });

  test("caseworker clicks Change on a justification row and is taken back to the justification page", async () => {
    const form = sharedPage.getByTestId("check-your-answers");
    const summaryCard = form.locator(".govuk-summary-card");

    const refusalReasonRow = summaryCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(confirmationLocale.refusalReasonTitle, {
        exact: true,
      }),
    });
    await refusalReasonRow.getByRole("link", { name: /change/i }).click();
    await sharedPage.waitForLoadState("domcontentloaded");

    await expect(sharedPage).toHaveURL(justificationPage);
  });

  test("caseworker sees pre-populated data on the justification page", async () => {
    const form = sharedPage.getByTestId("select-reason-for-refusal");

    await expect(
      form.getByRole("radio", { name: justificationLocale.radio.notInScope }),
    ).toBeChecked();
    await expect(
      form.getByLabel(justificationLocale.textarea.label),
    ).toHaveValue(justificationText);
  });

  test("caseworker updates the justification and returns to the Check your answers page", async () => {
    const updatedJustificationText = "Updated justification note";
    const form = sharedPage.getByTestId("select-reason-for-refusal");

    await form
      .getByLabel(justificationLocale.textarea.label)
      .fill(updatedJustificationText);
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(confirmationPage);

    const summaryCard = sharedPage
      .getByTestId("check-your-answers")
      .locator(".govuk-summary-card");
    await expect(summaryCard.getByText(updatedJustificationText)).toBeVisible();
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
    await expect(sharedPage.getByText(applicationId)).toBeVisible();
    await expect(
      sharedPage.getByRole("heading", { name: successLocale.whatHappensNext }),
    ).toBeVisible();
    await expect(
      sharedPage.getByText(successLocale.whatHappensNextBody),
    ).toBeVisible();
    const button = await sharedPage.getByRole("button", {
      name: successLocale.openApplicationsButton,
    });
    await expect(button).toHaveAttribute(
      "href",
      `/applications/${applicationId}/overview`,
    );
  });
});
