import { expect } from "@playwright/test";
import type { Locator, Page } from "playwright";

export async function continueToNextPage(
  form: Locator,
  page: Page,
): Promise<void> {
  const continueButton = form.getByRole("button");
  await continueButton.click();
  await page.waitForLoadState("domcontentloaded");
}

export async function validateFormAttributes(
  form: Locator,
  action: string,
): Promise<void> {
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", action);
}

export async function validateSubmitButton(
  form: Locator,
  buttonText: string = "Continue",
): Promise<void> {
  const continueButton = form.getByRole("button");
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toHaveText(buttonText);
  await expect(continueButton).toHaveAttribute("type", "submit");
}

export async function validateGovPage(
  page: Page,
  { headerText, backUrl }: { headerText: string; backUrl: string },
): Promise<void> {
  await validateGovHeader(page);
  await validatePageWrapper(page);
  await validateHeader(page, headerText, 1);
  await validateBackButton(page, backUrl);
}

export async function validateGovForm(
  form: Locator,
  { action }: { action: string },
): Promise<void> {
  await validateFormAttributes(form, action);
  await validateCSRFToken(form);
  await validateSubmitButton(form);
}

export async function validateGovHeader(page: Page): Promise<void> {
  const govUkHeader = page.locator("header", {
    has: page.getByRole("link", { name: "GOV.UK" }),
  });
  await expect(govUkHeader).toBeVisible();
}

export async function validatePageWrapper(page: Page): Promise<void> {
  const mainContent = page.locator("main.govuk-main-wrapper");
  await expect(mainContent).toBeVisible();

  const backLinkBeforeMain = page.locator(
    ".govuk-width-container > .govuk-back-link",
  );
  await expect(backLinkBeforeMain).toBeVisible();
}

export async function validateHeader(
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

export async function validateBackButton(
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

export async function validateSummaryCardKeys(
  card: Locator,
  keys: string[],
): Promise<void> {
  for (const key of keys) {
    await expect(card.locator("dt", { hasText: key })).toBeVisible();
  }
}
