import { Locator, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";

const applicationId = "50";
const makeADecisionPage = `/applications/${applicationId}/decision`; // data? update when we use MSW?
const backUrl = `/applications/${applicationId}/overview`;
const justificationPage = `/applications/${applicationId}/decision/justification`;

test.describe("Refuse application", () => {
  test("provider can view Make a decision page", async ({ page }) => {
    await page.goto(makeADecisionPage);

    const form = await page.getByTestId("make-a-decision");

    await validateGovPage(page, { headerText: "Make a decision", backUrl });
    await validateGovForm(form, { action: makeADecisionPage });

    const referenceLabel = form.getByRole("heading", {
      name: applicationId,
      level: 2,
    });
    await expect(referenceLabel).toBeVisible();

    const paragraphText =
      "Use this section to provide more details about your decision. This will be shared with the provider and recorded in application history.";
    const paragraphElement = form.getByText(paragraphText);
    await expect(paragraphElement).toBeVisible();

    const firstProceedingLabel = form.getByRole("heading", {
      name: "Death in Custody - Clinical Negligence",
      level: 2,
    });
    await expect(firstProceedingLabel).toBeVisible();

    const secondProceedingLabel = form.getByRole("heading", {
      name: "CAPA",
      level: 2,
    });
    await expect(secondProceedingLabel).toBeVisible();

    const firstCard = form.locator(".govuk-summary-card").filter({
      has: page.getByRole("heading", {
        name: "Death in Custody - Clinical Negligence",
      }),
    });
    await expect(firstCard.getByText("Certificate type")).toBeVisible();
    await expect(firstCard.getByText("Substantive")).toBeVisible();
    await expect(firstCard.getByText("Merits assessment")).toBeVisible();
    await expect(firstCard.getByText("Pending")).toBeVisible();

    const secondCard = form.locator(".govuk-summary-card").filter({
      has: page.getByRole("heading", { name: "CAPA" }),
    });
    await expect(secondCard.getByText("Certificate type")).toBeVisible();
    await expect(secondCard.getByText("Substantive")).toBeVisible();
    await expect(secondCard.getByText("Merits assessment")).toBeVisible();
    await expect(secondCard.getByText("Pending")).toBeVisible();

    const decisionRadiosLabel = form.getByText(
      "What is your overall decision?",
    );
    await expect(decisionRadiosLabel).toBeVisible();
    const grantRadio = form.getByRole("radio", { name: "Grant" });
    await expect(grantRadio).toBeVisible();
    const refuseRadio = form.getByRole("radio", { name: "Refuse" });
    await expect(refuseRadio).toBeVisible();
  });
  test("provider can continue to the next page", async ({ page }) => {
    await page.goto(makeADecisionPage);

    const form = await page.getByTestId("make-a-decision");
    const refuseRadio = form.getByRole("radio", { name: "Refuse" });
    await refuseRadio.check();
    await continueToNextPage(form, page);
    await expect(page).toHaveURL(justificationPage);
  });
});

test.describe("Refuse application - justification page", () => {
  test("provider can view Select a reason for refusal page", async ({
    page,
  }) => {
    await page.goto(justificationPage);

    await validateGovPage(page, {
      headerText: "Make a decision",
      backUrl: makeADecisionPage,
    });

    const form = page.getByTestId("select-reason-for-refusal");
    await validateGovForm(form, { action: justificationPage });

    const radioLabel = form.getByText("Select a reason for refusal");
    await expect(radioLabel).toBeVisible();

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
