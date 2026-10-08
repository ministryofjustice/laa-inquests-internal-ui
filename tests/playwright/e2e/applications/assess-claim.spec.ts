import { expect, test } from "../../fixtures/index.js";
import { validateCSRFToken } from "../../utils/govuk-validators.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

const claimAssessmentLocale = en.pages.claimAssessment;
const rejectedSuccessLocale = en.pages.claimAssessment.rejectedSuccess;

const laaReference = "INQ-YYY-005";
const claimReference = "INQC-0010-0010";
const assessClaimPage = `/applications/${laaReference}/claims/${claimReference}`;
const rejectedSuccessPage = `/applications/${laaReference}/claims/${claimReference}/rejected`;
const applicationOverviewPage = `/applications/${laaReference}/overview`;
const claimWithoutEvidenceReference = "INQC-0011-0011";
const assessClaimNoEvidencePage = `/applications/${laaReference}/claims/${claimWithoutEvidenceReference}`;
const claimVatZeroOnlyReference = "INQC-0012-0012";
const assessClaimVatZeroOnlyPage = `/applications/${laaReference}/claims/${claimVatZeroOnlyReference}`;
const finalBillClaimReference = "INQC-0013-0013";
const assessFinalBillClaimPage = `/applications/${laaReference}/claims/${finalBillClaimReference}`;
const finalBillRejectedSuccessPage = `${assessFinalBillClaimPage}/rejected`;
const nilBillClaimReference = "INQC-0014-0014";
const assessNilBillClaimPage = `/applications/${laaReference}/claims/${nilBillClaimReference}`;
const nilBillPaidInFullPage = `${assessNilBillClaimPage}/paid-in-full`;
const submittedPoaClaimReference = "INQC-0015-0015";
const assessSubmittedPoaClaimPage = `/applications/${laaReference}/claims/${submittedPoaClaimReference}`;
const submittedPoaPaidInFullPage = `${assessSubmittedPoaClaimPage}/paid-in-full`;

const rejectedPanelText = (claimType: string): string =>
  rejectedSuccessLocale.panel.replace("{claimType}", claimType);
const paidInFullPanelText = (claimType: string): string =>
  claimAssessmentLocale.paidInFullSuccess.panel.replace(
    "{claimType}",
    claimType,
  );

test.describe("Assess claim page", () => {
  for (const { reference, label, colour } of [
    {
      reference: submittedPoaClaimReference,
      label: "Submitted",
      colour: "blue",
    },
    {
      reference: "INQC-0016-0016",
      label: "Pay in full",
      colour: "green",
    },
    {
      reference: "INQC-0017-0017",
      label: "Rejected",
      colour: "red",
    },
  ]) {
    test(`shows exactly one ${colour} claim status tag for ${label}`, async ({
      page,
      checkAccessibility,
    }) => {
      await page.goto(`/applications/${laaReference}/claims/${reference}`);

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: claimAssessmentLocale.heading,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: laaReference,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(claimAssessmentLocale.radio.label, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "Pay in full", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "Reject", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continue", exact: true }),
      ).toBeVisible();

      const statusHeading = page.getByRole("heading", {
        level: 3,
        name: /^Claim status:/,
      });
      const statusTag = statusHeading.locator(".govuk-tag");

      await expect(statusTag).toHaveCount(1);
      await expect(statusTag).toHaveText(label);
      await expect(statusTag).toHaveClass(`govuk-tag govuk-tag--${colour}`);
      await checkAccessibility();
    });
  }

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
    await expect(claimsPanel.getByText("£2,000")).toBeVisible();

    const claimToAssessRow = claimsPanel.locator("tbody tr", {
      has: page.locator(
        `a[href="/applications/${laaReference}/claims/${claimReference}"]`,
      ),
    });
    await expect(
      claimToAssessRow.getByText("£1,200", { exact: true }),
    ).toBeVisible();
    await claimToAssessRow.getByRole("link", { name: claimReference }).click();

    await expect(page).toHaveURL(assessClaimPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: claimAssessmentLocale.heading,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: laaReference,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "Claim status: Submitted" }),
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
    await expect(pageForm.locator(".govuk-summary-list__key")).toHaveCount(4);
  });

  test("shows vat-zero payment amount when gross and net are not provided", async ({
    page,
  }) => {
    await page.goto(applicationOverviewPage);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    const vatZeroClaimTable = claimsPanel.locator("table", {
      has: page.locator(
        `a[href="/applications/${laaReference}/claims/${claimVatZeroOnlyReference}"]`,
      ),
    });
    const vatZeroClaimRow = vatZeroClaimTable.locator("tbody tr", {
      has: page.locator(
        `a[href="/applications/${laaReference}/claims/${claimVatZeroOnlyReference}"]`,
      ),
    });

    await expect(vatZeroClaimRow).toContainText("£800");
    await vatZeroClaimRow
      .getByRole("link", { name: claimVatZeroOnlyReference })
      .click();

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

  test("shows final bill claim details when provided", async ({ page }) => {
    await page.goto(assessFinalBillClaimPage);

    const pageForm = page.getByTestId("assess-claim");

    await expect(
      pageForm.getByText("Final bill", { exact: true }),
    ).toBeVisible();

    await expect(
      pageForm.getByText("Claim cost breakdown", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("final_bill_costs.xlsx", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByRole("link", { name: /Download final_bill_costs.xlsx/ }),
    ).toHaveAttribute(
      "href",
      `${assessFinalBillClaimPage}/evidence/3fa85f64-5717-4562-b3fc-2c963f66afa6?disposition=attachment`,
    );
    await expect(
      pageForm.getByText("claim-evidence-1.pdf", { exact: true }),
    ).toBeVisible();

    await expect(
      pageForm.getByRole("heading", { level: 2, name: "Counsel" }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("Number of counsel instructed", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("Counsel has been paid", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("Last working date", { exact: true }),
    ).toBeVisible();

    await expect(
      pageForm.getByRole("heading", { level: 3, name: "Other claim details" }),
    ).toBeVisible();
    await expect(
      pageForm.getByRole("heading", { level: 2, name: "Inquest details" }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("Alternative funding post-inquest", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByRole("heading", {
        level: 2,
        name: "Alternative funding details",
      }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("Recovery costs made", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByText("Paying party", { exact: true }),
    ).toBeVisible();
    await expect(
      pageForm.getByRole("heading", {
        level: 2,
        name: "Financial recovery costs",
      }),
    ).toBeVisible();
    await expect(pageForm.getByText("Costs", { exact: true })).toBeVisible();
    await expect(pageForm.getByText("Damages", { exact: true })).toBeVisible();
    await expect(pageForm.getByText("Interest", { exact: true })).toBeVisible();
    await expect(
      pageForm.getByText("Previous pre-certificate costs", { exact: true }),
    ).toHaveCount(2);
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

  test("does not show the claim cost breakdown, counsel, inquest outcome or alternate funding details for a payment on account claim", async ({
    page,
  }) => {
    await page.goto(assessClaimPage);

    const pageForm = page.getByTestId("assess-claim");

    await expect(
      pageForm.getByRole("heading", {
        level: 2,
        name: "Claim cost breakdown",
      }),
    ).toHaveCount(0);
    await expect(
      pageForm.getByRole("heading", {
        level: 2,
        name: "Counsel",
      }),
    ).toHaveCount(0);
    await expect(
      pageForm.getByRole("heading", {
        level: 2,
        name: "Other claim details",
      }),
    ).toHaveCount(0);
  });

  test("clicking download returns the cost breakdown as an xlsx attachment", async ({
    page,
  }) => {
    await page.goto(assessFinalBillClaimPage);

    const costBreakdownResponsePromise = page.waitForResponse(
      (response) =>
        response
          .url()
          .endsWith(
            `${assessFinalBillClaimPage}/evidence/3fa85f64-5717-4562-b3fc-2c963f66afa6?disposition=attachment`,
          ) && response.request().method() === "GET",
    );

    await page
      .getByRole("link", { name: /Download final_bill_costs.xlsx/ })
      .click();

    const costBreakdownResponse = await costBreakdownResponsePromise;

    expect(costBreakdownResponse.status()).toBe(200);
    expect(costBreakdownResponse.headers()["content-type"]).toContain(
      "spreadsheetml.sheet",
    );
    expect(costBreakdownResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });

  test("final bill claim page has no accessibility violations", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(assessFinalBillClaimPage);

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Claim cost breakdown",
      }),
    ).toBeVisible();

    await checkAccessibility();
  });

  test("assess claim page has no accessibility violations", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(assessClaimPage);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: claimAssessmentLocale.heading,
        exact: true,
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

  test("redirects to the confirm profit costs page when Pay in full is selected for a final bill", async ({
    page,
  }) => {
    await page.goto(assessFinalBillClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Pay in full" }).check();
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(
      `${assessFinalBillClaimPage}/confirm-profit-costs`,
    );
  });

  test("redirects straight to the paid in full confirmation page when Pay in full is selected for a Nil bill claim", async ({
    page,
  }) => {
    await page.goto(assessNilBillClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Pay in full" }).check();
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(nilBillPaidInFullPage);
    await expect(
      page.locator(".govuk-panel__title", {
        hasText: paidInFullPanelText("Nil bill"),
      }),
    ).toBeVisible();
  });

  test("redirects straight to the paid in full confirmation page when Pay in full is selected for a submitted POA claim", async ({
    page,
  }) => {
    await page.goto(assessSubmittedPoaClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Pay in full" }).check();
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(submittedPoaPaidInFullPage);
    await expect(
      page.locator(".govuk-panel__title", {
        hasText: paidInFullPanelText("Payment on account"),
      }),
    ).toBeVisible();
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
        hasText: rejectedPanelText("Payment on account"),
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

  test("shows the final bill claim type in the rejection success panel", async ({
    page,
  }) => {
    await page.goto(assessFinalBillClaimPage);
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Reject" }).check();
    await form
      .getByLabel(claimAssessmentLocale.reasonLabel)
      .fill("Not enough supporting evidence provided");
    await form.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(finalBillRejectedSuccessPage);

    await expect(
      page.locator(".govuk-panel__title", {
        hasText: rejectedPanelText("Final bill"),
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
        hasText: rejectedPanelText("Payment on account"),
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

  test.describe("Assess a claim RBAC behaviour", () => {
    test.afterEach(async ({ page }) => {
      await page.goto(`/auth/test-login`);
    });

    test("should have an assessClaim component when required roles are present", async ({
      page,
    }) => {
      const allowedRoles = [INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER];
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto(
          `/applications/${laaReference}/claims/${claimReference}`,
        );
        await expect(page.getByRole("radio", { name: "Reject" })).toBeVisible();
        await expect(
          page.getByRole("radio", { name: "Pay in full" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Continue" }),
        ).toBeVisible();
      }
    });

    test("should not have an assessClaim component when required roles are absent", async ({
      page,
    }) => {
      const deniedRoles = [
        INTERNAL_CASEWORKER_ROLES.CUSTOMER_SERVICE_AGENT,
        INTERNAL_CASEWORKER_ROLES.ASSURANCE,
      ];
      for (const role of deniedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto(
          `/applications/${laaReference}/claims/${claimReference}`,
        );
        await expect(
          page.getByRole("radio", { name: "Reject" }),
        ).not.toBeVisible();
        await expect(
          page.getByRole("radio", { name: "Pay in full" }),
        ).not.toBeVisible();
        await expect(
          page.getByRole("button", { name: "Continue" }),
        ).not.toBeVisible();
      }
    });
  });
});
