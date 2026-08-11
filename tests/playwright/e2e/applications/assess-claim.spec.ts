import { expect, test } from "../../fixtures/index.js";

const applicationId = "5";
const claimId = "10";
const assessClaimPage = `/applications/${applicationId}/claims/${claimId}`;
const confirmationPage = `${assessClaimPage}/confirmation`;

test.describe("Assess claim page", () => {
  test("renders the claim assessment page with summary cards and evidence", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Assess a claim and make a decision",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: applicationId }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "Claim status: Reject" }),
    ).toBeVisible();

    const pageForm = page.getByTestId("assess-claim");
    await expect(pageForm).toHaveAttribute("method", "post");
    await expect(pageForm).toHaveAttribute("action", assessClaimPage);

    await expect(pageForm.getByText("Overview of the claim")).toBeVisible();
    await expect(pageForm.getByText("Payment type")).toBeVisible();
    await expect(pageForm.getByText("Payment on account")).toBeVisible();
    await expect(pageForm.getByText("Payment amount")).toBeVisible();
    await expect(pageForm.getByText("£1,200")).toBeVisible();
    await expect(pageForm.getByText("Substantive certificate")).toBeVisible();
    await expect(pageForm.getByText("Total remaining")).toBeVisible();
    await expect(pageForm.getByText("£10,000")).toHaveCount(2);

    await expect(pageForm.getByText("Details of the claim")).toBeVisible();
    await expect(
      pageForm.getByText("Instructed counsel on the case"),
    ).toBeVisible();
    await expect(pageForm.getByText("Last working date")).toBeVisible();
    await expect(pageForm.getByText("Outcome of inquest")).toBeVisible();
    await expect(
      pageForm.getByText("Has the matter progressed to alternate funding"),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 3, name: "Supporting evidence" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Some pieces of evidence cannot be viewed in browser and may need to be downloaded",
      ),
    ).toBeVisible();

    await expect(
      pageForm.getByRole("heading", { level: 2, name: "Other evidence" }),
    ).toBeVisible();
    await expect(
      pageForm.locator(".govuk-summary-list__key", {
        hasText: "claim-evidence-1.pdf",
      }),
    ).toBeVisible();
    await expect(
      pageForm.locator(".govuk-summary-list__key", {
        hasText: "claim-evidence-2.pdf",
      }),
    ).toBeVisible();
    await expect(
      pageForm.getByRole("link", { name: /View claim-evidence-1.pdf/ }),
    ).toBeVisible();
    await expect(
      pageForm.getByRole("link", { name: /Download claim-evidence-1.pdf/ }),
    ).toBeVisible();

    await expect(
      pageForm.getByRole("radio", { name: "Pay in full" }),
    ).toBeVisible();
    await expect(pageForm.getByRole("radio", { name: "Reject" })).toBeVisible();
    await expect(
      pageForm.getByRole("button", { name: "Continue" }),
    ).toBeVisible();
  });

  test("shows validation error when no decision is selected", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    const pageForm = page.getByTestId("assess-claim");
    await pageForm.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(assessClaimPage);
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Select the claim decision" }),
    ).toBeVisible();
    await expect(pageForm.locator(".govuk-error-message")).toContainText(
      "Select the claim decision",
    );
  });

  test("redirects to placeholder confirmation page when Pay in full is selected", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    const pageForm = page.getByTestId("assess-claim");
    await pageForm.getByRole("radio", { name: "Pay in full" }).check();
    await pageForm.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(confirmationPage);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Claim decision confirmation placeholder",
      }),
    ).toBeVisible();
  });

  test("redirects to placeholder confirmation page when Reject is selected", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    const pageForm = page.getByTestId("assess-claim");
    await pageForm.getByRole("radio", { name: "Reject" }).check();
    await pageForm.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(confirmationPage);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Claim decision confirmation placeholder",
      }),
    ).toBeVisible();
  });

  test("renders confirmation placeholder on direct navigation", async ({
    page,
  }) => {
    await page.goto(confirmationPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Claim decision confirmation placeholder",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("This page is a placeholder and does not call the API."),
    ).toBeVisible();
  });
});
