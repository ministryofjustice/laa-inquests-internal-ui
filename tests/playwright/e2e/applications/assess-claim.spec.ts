import { expect, test } from "../../fixtures/index.js";

const applicationId = "5";
const claimId = "10";
const assessClaimPage = `/applications/${applicationId}/claims/${claimId}`;
const applicationOverviewPage = `/applications/${applicationId}/overview`;
const claimWithoutEvidenceId = "11";
const assessClaimNoEvidencePage = `/applications/${applicationId}/claims/${claimWithoutEvidenceId}`;
const claimVatZeroOnlyId = "12";
const assessClaimVatZeroOnlyPage = `/applications/${applicationId}/claims/${claimVatZeroOnlyId}`;

test.describe("Assess claim page", () => {
  test("opens a specific claim from the claims tab and shows that claim's data", async ({
    page,
  }) => {
    await page.goto(applicationOverviewPage);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Claims to be assessed",
      }),
    ).toBeVisible();
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Assessed claims",
      }),
    ).toBeVisible();
    await expect(claimsPanel.getByText("£1,200")).toBeVisible();
    await expect(claimsPanel.getByText("£2,000")).toBeVisible();

    const claimToAssessRow = claimsPanel.locator("tbody tr", {
      has: page.locator(
        `a[href="/applications/${applicationId}/claims/${claimId}"]`,
      ),
    });
    await claimToAssessRow.getByRole("link", { name: "See details" }).click();

    await expect(page).toHaveURL(assessClaimPage);

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
    await expect(pageForm.getByText("£2,000")).toHaveCount(0);
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

  test("does not render other evidence summary list when no supporting evidence exists", async ({
    page,
  }) => {
    await page.goto(assessClaimNoEvidencePage);

    const pageForm = page.getByTestId("assess-claim");

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
    ).toHaveCount(0);
    await expect(pageForm.locator(".govuk-summary-list__key")).toHaveCount(8);
  });

  test("shows vat-zero payment amount when gross and net are not provided", async ({
    page,
  }) => {
    await page.goto(applicationOverviewPage);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    const vatZeroClaimTable = claimsPanel.locator("table", {
      has: page.locator(
        `a[href="/applications/${applicationId}/claims/${claimVatZeroOnlyId}"]`,
      ),
    });
    const vatZeroClaimRow = vatZeroClaimTable.locator("tbody tr", {
      has: page.locator(
        `a[href="/applications/${applicationId}/claims/${claimVatZeroOnlyId}"]`,
      ),
    });

    await expect(vatZeroClaimRow).toContainText("£800");
    await vatZeroClaimRow.getByRole("link", { name: "See details" }).click();

    await expect(page).toHaveURL(assessClaimVatZeroOnlyPage);

    const pageForm = page.getByTestId("assess-claim");
    await expect(pageForm).toHaveAttribute(
      "action",
      assessClaimVatZeroOnlyPage,
    );
    await expect(pageForm.getByText("Payment amount")).toBeVisible();
    await expect(pageForm.getByText("£800")).toBeVisible();
    await expect(pageForm.getByText("£1,200")).toHaveCount(0);
  });
});
