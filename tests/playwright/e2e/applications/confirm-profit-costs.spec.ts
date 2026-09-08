import { expect, test } from "../../fixtures/index.js";
import {
  validateBackButton,
  validateCSRFToken,
  validateFormAttributes,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const confirmProfitCostsLocale = en.pages.claimAssessment.confirmProfitCosts;

const applicationId = "INQ-YYY-005";
const claimId = "10";
const assessClaimPage = `/applications/${applicationId}/claims/${claimId}`;
const confirmProfitCostsPage = `${assessClaimPage}/confirm-profit-costs`;

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
    await expect(netTotalInput).toHaveValue("");
    await expect(
      form.getByText(confirmProfitCostsLocale.netHint),
    ).toBeVisible();

    const grossTotalInput = form.getByLabel(
      confirmProfitCostsLocale.grossLabel,
    );
    await expect(grossTotalInput).toBeVisible();
    await expect(grossTotalInput).toHaveValue("");
    await expect(
      form.getByText(confirmProfitCostsLocale.grossHint),
    ).toBeVisible();

    const zeroVatTotalInput = form.getByLabel(
      confirmProfitCostsLocale.zeroLabel,
    );
    await expect(zeroVatTotalInput).toBeVisible();
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
});
