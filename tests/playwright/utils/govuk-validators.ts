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
  await validateMojHeader(page);
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

export async function validateMojHeader(page: Page): Promise<void> {
  const header = page.getByRole("banner").first();
  await expect(header).toBeVisible();

  // Validate Legal Aid Agency organization label
  const laaLink = header.getByRole("link", { name: "Legal Aid Agency" });
  await expect(laaLink).toBeVisible();

  // Validate Inquests service label
  const inquestsLink = header.getByRole("link", { name: "Inquests" });
  await expect(inquestsLink).toBeVisible();

  // Validate account navigation
  const navigation = header.getByRole("navigation", { name: "Account navigation" });
  await expect(navigation).toBeVisible();

  // Validate account name link
  const accountNameLink = navigation.getByRole("link", { name: "Account name" });
  await expect(accountNameLink).toBeVisible();

  // Validate sign out link
  const signOutLink = navigation.getByRole("link", { name: "Sign out" });
  await expect(signOutLink).toBeVisible();
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
