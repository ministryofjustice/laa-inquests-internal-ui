import type { Locator, Page } from "playwright";
import { expect, test } from "../../fixtures/index.js";
import {
  validateBackButton,
  validateCSRFToken,
  validateFormAttributes,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const confirmProfitCostsLocale = en.pages.claimAssessment.confirmProfitCosts;
const validationErrors = confirmProfitCostsLocale.validationErrors;

const applicationId = "INQ-YYY-005";
const claimReference = "INQC-0013-0013";
const assessClaimPage = `/applications/${applicationId}/claims/${claimReference}`;
const confirmProfitCostsPage = `${assessClaimPage}/confirm-profit-costs`;
const nextPagePattern = /\/(?:confirm-disbursement-costs|check-your-answers)$/v;

async function setTotals(
  form: Locator,
  { net = "", gross = "", zeroVat = "" }: Partial<Record<string, string>> = {},
): Promise<void> {
  await form.getByLabel(confirmProfitCostsLocale.netLabel).fill(net);
  await form.getByLabel(confirmProfitCostsLocale.grossLabel).fill(gross);
  await form.getByLabel(confirmProfitCostsLocale.zeroLabel).fill(zeroVat);
}

async function submitForm(form: Locator, page: Page): Promise<void> {
  await form
    .getByRole("button", { name: confirmProfitCostsLocale.continue })
    .click();
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Confirm the total profit costs page", () => {
  test("renders the confirm profit costs page after selecting Pay in full and continuing", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(assessClaimPage);
    const assessForm = page.getByTestId("assess-claim");

    await assessForm.getByRole("radio", { name: "Pay in full" }).check();
    await assessForm.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(confirmProfitCostsPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: confirmProfitCostsLocale.heading,
      }),
    ).toBeVisible();

    await expect(page.getByText(confirmProfitCostsLocale.intro1)).toBeVisible();
    await expect(page.getByText(confirmProfitCostsLocale.intro2)).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: confirmProfitCostsLocale.vat20Heading,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: confirmProfitCostsLocale.vat0Heading,
      }),
    ).toBeVisible();

    const form = page.getByTestId("confirm-profit-costs");
    await validateFormAttributes(form, confirmProfitCostsPage);
    await validateCSRFToken(form);

    const netTotalInput = form.getByLabel(confirmProfitCostsLocale.netLabel);
    await expect(netTotalInput).toBeVisible();
    await expect(netTotalInput).toHaveAttribute("autocomplete", "off");
    await expect(netTotalInput).toHaveValue("");
    await expect(
      form.getByText(confirmProfitCostsLocale.netHint),
    ).toBeVisible();

    const grossTotalInput = form.getByLabel(
      confirmProfitCostsLocale.grossLabel,
    );
    await expect(grossTotalInput).toBeVisible();
    await expect(grossTotalInput).toHaveAttribute("autocomplete", "off");
    await expect(grossTotalInput).toHaveValue("");
    await expect(
      form.getByText(confirmProfitCostsLocale.grossHint),
    ).toBeVisible();

    const zeroVatTotalInput = form.getByLabel(
      confirmProfitCostsLocale.zeroLabel,
    );
    await expect(zeroVatTotalInput).toBeVisible();
    await expect(zeroVatTotalInput).toHaveAttribute("autocomplete", "off");
    await expect(zeroVatTotalInput).toHaveValue("");
    await expect(
      form.getByText(confirmProfitCostsLocale.zeroHint),
    ).toBeVisible();

    await validateSubmitButton(form, confirmProfitCostsLocale.continue);
    await validateBackButton(page, assessClaimPage);

    await checkAccessibility();
  });

  test("re-renders the confirm profit costs page when Continue is clicked", async ({
    page,
  }) => {
    await page.goto(confirmProfitCostsPage);
    const form = page.getByTestId("confirm-profit-costs");

    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(confirmProfitCostsPage);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: confirmProfitCostsLocale.heading,
      }),
    ).toBeVisible();
  });

  for (const { scenario, net, gross } of [
    { scenario: "gross is less than net", net: "400", gross: "360" },
    { scenario: "gross is equal to net", net: "300", gross: "300" },
    { scenario: "gross is 0 and net is positive", net: "10", gross: "0" },
  ]) {
    test(`shows a gross error and retains values when ${scenario}`, async ({
      page,
    }) => {
      await page.goto(confirmProfitCostsPage);
      const form = page.getByTestId("confirm-profit-costs");
      const errorMessage = validationErrors.grossLessThanNet;

      await setTotals(form, { net, gross });
      await submitForm(form, page);

      await expect(page).toHaveURL(confirmProfitCostsPage);
      await expect(
        page
          .locator(".govuk-error-summary")
          .getByRole("link", { name: errorMessage }),
      ).toHaveAttribute("href", "#gross-total");
      await expect(
        form.locator(".govuk-error-message", { hasText: errorMessage }),
      ).toBeVisible();
      await expect(
        form.getByLabel(confirmProfitCostsLocale.netLabel),
      ).toHaveValue(net);
      await expect(
        form.getByLabel(confirmProfitCostsLocale.grossLabel),
      ).toHaveValue(gross);
    });
  }

  test("continues when gross is more than net", async ({ page }) => {
    await page.goto(confirmProfitCostsPage);
    const form = page.getByTestId("confirm-profit-costs");

    await setTotals(form, { net: "300", gross: "360" });
    await submitForm(form, page);

    await expect(page).toHaveURL(nextPagePattern);
  });

  test("allows a nil bill where the net and gross totals are both 0", async ({
    page,
  }) => {
    await page.goto(confirmProfitCostsPage);
    const form = page.getByTestId("confirm-profit-costs");

    await setTotals(form, { net: "0", gross: "0" });
    await submitForm(form, page);

    await expect(page).toHaveURL(nextPagePattern);
  });
});
