import { expect, test } from "../../fixtures/index.js";
import { validateCSRFToken } from "../../utils/govuk-validators.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const claimAssessmentLocale = en.pages.claimAssessment;
const rejectedSuccessLocale = en.pages.claimAssessment.rejectedSuccess;

const applicationId = "5";
const claimId = "10";
const assessClaimPage = `/applications/${applicationId}/claims/${claimId}`;
const rejectedSuccessPage = `/applications/${applicationId}/claims/${claimId}/rejected`;
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
    await expect(pageForm.getByText("£10,000")).toHaveCount(1);
    await expect(pageForm.getByText("£8,800")).toBeVisible();

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
    ).toHaveAttribute(
      "href",
      `${assessClaimPage}/evidence/test_evidence_1?disposition=inline`,
    );
    await expect(
      pageForm.getByRole("link", { name: /Download claim-evidence-1.pdf/ }),
    ).toHaveAttribute(
      "href",
      `${assessClaimPage}/evidence/test_evidence_1?disposition=attachment`,
    );
    await expect(
      pageForm.getByRole("link", { name: /View claim-evidence-2.pdf/ }),
    ).toHaveAttribute(
      "href",
      `${assessClaimPage}/evidence/test_evidence_2?disposition=inline`,
    );
    await expect(
      pageForm.getByRole("link", { name: /Download claim-evidence-2.pdf/ }),
    ).toHaveAttribute(
      "href",
      `${assessClaimPage}/evidence/test_evidence_2?disposition=attachment`,
    );

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

  test("clicking view returns an inline evidence response", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    const evidenceResponsePromise = page.waitForResponse(
      (response) =>
        response
          .url()
          .endsWith(
            `${assessClaimPage}/evidence/test_evidence_1?disposition=inline`,
          ) && response.request().method() === "GET",
    );

    await page.getByRole("link", { name: /View claim-evidence-1.pdf/ }).click();

    const evidenceResponse = await evidenceResponsePromise;

    expect(evidenceResponse.status()).toBe(200);
    expect(evidenceResponse.headers()["content-type"]).toContain(
      "application/pdf",
    );
    expect(evidenceResponse.headers()["content-disposition"]).toContain(
      "inline",
    );
  });

  test("clicking download returns an attachment evidence response", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    const evidenceResponsePromise = page.waitForResponse(
      (response) =>
        response
          .url()
          .endsWith(
            `${assessClaimPage}/evidence/test_evidence_1?disposition=attachment`,
          ) && response.request().method() === "GET",
    );

    await page
      .getByRole("link", { name: /Download claim-evidence-1.pdf/ })
      .click();

    const evidenceResponse = await evidenceResponsePromise;

    expect(evidenceResponse.status()).toBe(200);
    expect(evidenceResponse.headers()["content-type"]).toContain(
      "application/pdf",
    );
    expect(evidenceResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });

  test("assess claim page has no accessibility violations", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(assessClaimPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Assess a claim and make a decision",
      }),
    ).toBeVisible();

    await checkAccessibility();
  });

  test("reveals the rejection reason field when Reject is selected", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    const rejectionReasonInput = form.getByLabel(
      claimAssessmentLocale.reasonLabel,
    );
    await expect(rejectionReasonInput).toBeHidden();

    await form.getByRole("radio", { name: "Reject" }).check();

    await expect(rejectionReasonInput).toBeVisible();
    await expect(
      form.getByText(claimAssessmentLocale.reasonHint),
    ).toBeVisible();
    await expect(form.locator(".govuk-character-count__status")).toHaveText(
      "You have 500 characters remaining",
    );

    await validateCSRFToken(form);
  });

  test("shows a validation error when no claim decision is selected", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(assessClaimPage);

    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByRole("link", {
        name: claimAssessmentLocale.radio.validationError,
      }),
    ).toHaveAttribute("href", "#assess-claim");

    await expect(
      form.locator(".govuk-error-message", {
        hasText: claimAssessmentLocale.radio.validationError,
      }),
    ).toBeVisible();
  });

  test("shows a validation error when Reject is selected without a reason", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Reject" }).check();
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(assessClaimPage);

    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByRole("link", {
        name: claimAssessmentLocale.radio.validationErrors.reasonNotEmpty,
      }),
    ).toHaveAttribute("href", "#rejection-reason");

    await expect(
      form.locator(".govuk-error-message", {
        hasText: claimAssessmentLocale.radio.validationErrors.reasonNotEmpty,
      }),
    ).toBeVisible();
  });

  test("shows a validation error when the rejection reason exceeds 500 characters", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Reject" }).check();
    const rejectionReasonInput = form.getByLabel(
      claimAssessmentLocale.reasonLabel,
    );
    await rejectionReasonInput.fill("a".repeat(540));

    await expect(form.locator(".govuk-character-count__status")).toHaveText(
      "You have 40 characters too many",
    );

    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(assessClaimPage);

    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByRole("link", {
        name: claimAssessmentLocale.radio.validationErrors.reasonTooLong,
      }),
    ).toHaveAttribute("href", "#rejection-reason");

    await expect(
      form.locator(".govuk-error-message", {
        hasText: claimAssessmentLocale.radio.validationErrors.reasonTooLong,
      }),
    ).toBeVisible();
  });

  test("redirects to the application overview when Pay in full is selected", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Pay in full" }).check();
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(applicationOverviewPage);
  });

  test("shows the rejection success page when Reject is selected with a valid reason", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Reject" }).check();
    await form
      .getByLabel(claimAssessmentLocale.reasonLabel)
      .fill("Not enough supporting evidence provided");
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(rejectedSuccessPage);

    await expect(
      page.locator(".govuk-panel__title", {
        hasText: rejectedSuccessLocale.panel,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: rejectedSuccessLocale.whatHappensNext,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(rejectedSuccessLocale.whatHappensNextBody),
    ).toBeVisible();
    await expect(
      page.locator(".govuk-warning-text", {
        hasText: rejectedSuccessLocale.warning,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: rejectedSuccessLocale.assessNewClaimButton,
      }),
    ).toBeVisible();
  });

  test("Assess a new claim button returns to the application overview claims tab", async ({
    page,
  }) => {
    await page.goto(rejectedSuccessPage);

    await page
      .getByRole("button", { name: rejectedSuccessLocale.assessNewClaimButton })
      .click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(`${applicationOverviewPage}#claims`);
    await expect(page.getByRole("tab", { name: "Claims" })).toBeVisible();
  });

  test("rejection success page has no accessibility violations", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(rejectedSuccessPage);

    await expect(
      page.locator(".govuk-panel__title", {
        hasText: rejectedSuccessLocale.panel,
      }),
    ).toBeVisible();

    await checkAccessibility();
  });

  test("assess claim page validation errors have no accessibility violations", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(assessClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Reject" }).check();
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".govuk-error-summary")).toBeVisible();

    await checkAccessibility();
  });
});
