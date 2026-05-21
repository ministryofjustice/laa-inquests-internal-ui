import { BrowserContext, Locator, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";
import { TEST_CONFIG } from "../../playwright.config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const meritsLocale = en.pages.decision.merits;
const justificationLocale = en.pages.decision.justification;
const confirmationLocale = en.pages.decision.confirmation;

const applicationId = "1";
const makeADecisionPage = `/applications/${applicationId}/decision`;
const overviewPage = `/applications/${applicationId}/overview`;
const justificationPage = `/applications/${applicationId}/decision/justification`;
const confirmationPage = `/applications/${applicationId}/decision/confirmation`;
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

  test("provider views the Make a decision page", async () => {
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
    await expect(firstCard.getByText("Pending")).toBeVisible();

    await expect(form.getByText(meritsLocale.radio.label)).toBeVisible();
    await expect(
      form.getByRole("radio", { name: meritsLocale.radio.grantLabel }),
    ).toBeVisible();
    await expect(
      form.getByRole("radio", { name: meritsLocale.radio.refuseLabel }),
    ).toBeVisible();
  });

  test("provider selects Refuse and continues to justification page", async () => {
    const form = sharedPage.getByTestId("make-a-decision");
    await form
      .getByRole("radio", { name: meritsLocale.radio.refuseLabel })
      .check();
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(justificationPage);
  });

  test("provider views the Select a reason for refusal page", async () => {
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

  test("provider selects a reason and continues to confirmation page", async () => {
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

  test("provider views the Check your answers page", async () => {
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
    await expect(
      summaryCard.getByText(confirmationLocale.meritsAssessmentTitle),
    ).toBeVisible();
    await expect(summaryCard.getByText("Pending")).toBeVisible();

    const overallDecisionRow = summaryCard.locator(".govuk-summary-list__row", {
      has: sharedPage.getByText(confirmationLocale.overallDecisionTitle, {
        exact: true,
      }),
    });
    await expect(
      overallDecisionRow.getByText(meritsLocale.radio.refuseLabel, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      overallDecisionRow.getByRole("link", { name: /change/i }),
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

  test("provider clicks Change on a row and is taken back to the justification page", async () => {
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

  test("provider sees pre-populated data on the justification page", async () => {
    const form = sharedPage.getByTestId("select-reason-for-refusal");

    await expect(
      form.getByRole("radio", { name: justificationLocale.radio.notInScope }),
    ).toBeChecked();
    await expect(
      form.getByLabel(justificationLocale.textarea.label),
    ).toHaveValue(justificationText);
  });

  test("provider updates the justification and returns to the Check your answers page", async () => {
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
});

async function continueToNextPage(form: Locator, page: Page): Promise<void> {
  const continueButton = form.getByRole("button");
  await continueButton.click();
  await page.waitForLoadState("domcontentloaded");
}

async function validateFormAttributes(
  form: Locator,
  action: string,
): Promise<void> {
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", action);
}

async function validateSubmitButton(
  form: Locator,
  buttonText: string = "Continue",
): Promise<void> {
  const continueButton = form.getByRole("button");
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toHaveText(buttonText);
  await expect(continueButton).toHaveAttribute("type", "submit");
}

async function validateGovPage(
  page: Page,
  { headerText, backUrl }: { headerText: string; backUrl: string },
): Promise<void> {
  await validateGovHeader(page);
  await validatePageWrapper(page);
  await validateHeader(page, headerText, 1);
  await validateBackButton(page, backUrl);
}

async function validateGovForm(
  form: Locator,
  { action }: { action: string },
): Promise<void> {
  await validateFormAttributes(form, action);
  await validateCSRFToken(form);
  await validateSubmitButton(form);
}

async function validateGovHeader(page: Page): Promise<void> {
  const govUkHeader = page.locator("header", {
    has: page.getByRole("link", { name: "GOV.UK" }),
  });
  await expect(govUkHeader).toBeVisible();
}

async function validatePageWrapper(page: Page): Promise<void> {
  const mainContent = page.locator("main.govuk-main-wrapper");
  await expect(mainContent).toBeVisible();

  const backLinkBeforeMain = page.locator(
    ".govuk-width-container > .govuk-back-link",
  );
  await expect(backLinkBeforeMain).toBeVisible();
}

async function validateHeader(
  page: Page,
  headerText: string,
  headingLevel: number,
): Promise<void> {
  const heading = page.getByRole("heading", {
    level: headingLevel,
    name: headerText,
  });
  await expect(heading).toBeVisible();
}

async function validateBackButton(
  page: Page,
  previousUrl: string,
): Promise<void> {
  const backButton = page.getByRole("link", { name: "Back", exact: true });
  await expect(backButton).toBeVisible();
  await expect(backButton).toHaveAttribute("href", previousUrl);
}

export async function validateCSRFToken(form: Locator): Promise<void> {
  const csrfToken = form.locator("input[name='_csrf']");
  await expect(csrfToken).toBeHidden();
  await expect(csrfToken).not.toBeEmpty();
}
