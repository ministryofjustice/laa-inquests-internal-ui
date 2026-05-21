import { Locator, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";

const applicationId = "1";
const makeADecisionPage = `/applications/${applicationId}/decision`;
const overviewPage = `/applications/${applicationId}/overview`;
const justificationPage = `/applications/${applicationId}/decision/justification`;
const confirmationPage = `/applications/${applicationId}/decision/confirmation`;

test.describe.serial("Refuse application journey", () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  test("provider views the Make a decision page", async () => {
    await sharedPage.goto(makeADecisionPage);

    const form = sharedPage.getByTestId("make-a-decision");

    await validateGovPage(sharedPage, {
      headerText: "Make a decision",
      backUrl: overviewPage,
    });
    await validateGovForm(form, { action: makeADecisionPage });

    const referenceLabel = form.getByRole("heading", {
      name: applicationId,
      level: 2,
    });
    await expect(referenceLabel).toBeVisible();

    const paragraphText =
      "Use this section to provide more details about your decision. This will be shared with the provider and recorded in application history.";
    await expect(form.getByText(paragraphText)).toBeVisible();

    const firstCard = form.locator(".govuk-summary-card").filter({
      has: sharedPage.getByRole("heading", {
        name: "Overview",
      }),
    });
    await expect(firstCard.getByText("Certificate type")).toBeVisible();
    await expect(firstCard.getByText("Substantive")).toBeVisible();
    await expect(firstCard.getByText("Merits assessment")).toBeVisible();
    await expect(firstCard.getByText("Pending")).toBeVisible();

    await expect(
      form.getByText("What is your overall decision?"),
    ).toBeVisible();
    await expect(form.getByRole("radio", { name: "Grant" })).toBeVisible();
    await expect(form.getByRole("radio", { name: "Refuse" })).toBeVisible();
  });

  test("provider selects Refuse and continues to justification page", async () => {
    const form = sharedPage.getByTestId("make-a-decision");
    await form.getByRole("radio", { name: "Refuse" }).check();
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(justificationPage);
  });

  test("provider views the Select a reason for refusal page", async () => {
    await validateGovPage(sharedPage, {
      headerText: "Make a decision",
      backUrl: makeADecisionPage,
    });

    const form = sharedPage.getByTestId("select-reason-for-refusal");
    await validateGovForm(form, { action: justificationPage });

    await expect(form.getByText("Select a reason for refusal")).toBeVisible();
    await expect(
      form.getByRole("radio", { name: "Not in scope" }),
    ).toBeVisible();
    await expect(
      form.getByRole("radio", { name: "Insufficient information" }),
    ).toBeVisible();
    await expect(
      form.getByRole("radio", { name: "Duplicate case" }),
    ).toBeVisible();
  });

  test("provider selects a reason and continues to confirmation page", async () => {
    const form = sharedPage.getByTestId("select-reason-for-refusal");
    await form.getByRole("radio", { name: "Not in scope" }).check();
    await continueToNextPage(form, sharedPage);
    await expect(sharedPage).toHaveURL(confirmationPage);
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

async function validateContinueButton(form: Locator): Promise<void> {
  const continueButton = form.getByRole("button");
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toHaveText("Continue");
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
  await validateContinueButton(form);
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
