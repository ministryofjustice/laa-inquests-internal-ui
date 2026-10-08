import { expect, test } from "../../fixtures/index.js";
import type { Locator, Page } from "@playwright/test";

const laaReference = "INQ-YYY-005";

interface AssessedClaimCase {
  decision: string;
  claimReference: string;
  claimStatus: string;
  paymentType: string;
  paymentAmount: string;
  vatZeroTotal: string;
  netTotal: string;
  grossTotal: string;
}

const assessedClaimCases: AssessedClaimCase[] = [
  {
    decision: "PAY_IN_FULL",
    claimReference: "INQC-0030-0030",
    claimStatus: "Pay in full",
    paymentType: "Payment on account",
    paymentAmount: "£2,000",
    vatZeroTotal: "-",
    netTotal: "£1,600",
    grossTotal: "£2,000",
  },
  {
    decision: "REJECT",
    claimReference: "INQC-0031-0031",
    claimStatus: "Reject",
    paymentType: "Final bill",
    paymentAmount: "£170",
    vatZeroTotal: "-",
    netTotal: "£170",
    grossTotal: "-",
  },
];

const claimPage = (claimReference: string): string =>
  `/applications/${laaReference}/claims/${claimReference}`;

const summaryCard = (page: Page, title: string): Locator =>
  page.locator(".govuk-summary-card", {
    has: page.getByRole("heading", { name: title, exact: true }),
  });

const summaryRow = (card: Locator, key: string): Locator =>
  card.locator(".govuk-summary-list__row", {
    has: card.page().locator(".govuk-summary-list__key", {
      hasText: key,
    }),
  });

for (const assessed of assessedClaimCases) {
  test.describe(`Assessed claim page - ${assessed.decision} claim`, () => {
    const assessedPage = claimPage(assessed.claimReference);

    test.beforeEach(async ({ page }) => {
      await page.goto(assessedPage);
    });

    test("shows the claim reference as the page heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: assessed.claimReference,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 3,
          name: `Claim status: ${assessed.claimStatus}`,
        }),
      ).toBeVisible();
    });

    test("shows the overview of the claim without the total remaining row", async ({
      page,
    }) => {
      const overview = summaryCard(page, "Overview of the claim");

      await expect(
        summaryRow(overview, "Payment type").locator(
          ".govuk-summary-list__value",
        ),
      ).toHaveText(assessed.paymentType);
      await expect(
        summaryRow(overview, "Payment amount").locator(
          ".govuk-summary-list__value",
        ),
      ).toHaveText(assessed.paymentAmount);
      await expect(summaryRow(overview, "Substantive certificate")).toHaveCount(
        1,
      );
      await expect(overview.getByText("Total remaining")).toHaveCount(0);
    });

    test("shows the details of the claim table directly after the overview", async ({
      page,
    }) => {
      const details = summaryCard(page, "Details of the claim");

      await expect(details).toBeVisible();
      await expect(
        summaryRow(details, "Total costs charged at 0% VAT").locator(
          ".govuk-summary-list__value",
        ),
      ).toHaveText(assessed.vatZeroTotal);
      await expect(
        summaryRow(details, "Net total excluding VAT").locator(
          ".govuk-summary-list__value",
        ),
      ).toHaveText(assessed.netTotal);
      await expect(
        summaryRow(details, "Gross total of the claim including VAT").locator(
          ".govuk-summary-list__value",
        ),
      ).toHaveText(assessed.grossTotal);

      const cardTitles = await page
        .locator(".govuk-summary-card__title")
        .allTextContents();
      expect(cardTitles.map((title) => title.trim()).slice(0, 2)).toStrictEqual(
        ["Overview of the claim", "Details of the claim"],
      );
    });

    test("shows evidence files as left aligned rows with a bold view link, format and size", async ({
      page,
    }) => {
      const evidenceCard = summaryCard(page, "Other evidence");
      const sizedFile = summaryRow(evidenceCard, "claim-evidence-1.pdf");
      const expectedSize =
        assessed.decision === "REJECT" ? "pdf 1.5MB" : "pdf 102KB";

      await expect(
        sizedFile.locator(".govuk-summary-list__actions"),
      ).toHaveCount(0);

      const viewLink = sizedFile
        .locator(".govuk-summary-list__value")
        .getByRole("link", { name: /^View claim-evidence-1\.pdf$/ });
      await expect(viewLink).toHaveAttribute(
        "href",
        `${assessedPage}/evidence/test_evidence_1?disposition=inline`,
      );
      await expect(viewLink).toHaveClass(/govuk-!-font-weight-bold/);

      const downloadLink = sizedFile
        .locator(".govuk-summary-list__value")
        .getByRole("link", {
          name: `Download claim-evidence-1.pdf (${expectedSize})`,
          exact: true,
        });
      await expect(downloadLink).toHaveAttribute(
        "href",
        `${assessedPage}/evidence/test_evidence_1?disposition=attachment`,
      );
      await expect(
        sizedFile.locator(".govuk-summary-list__value"),
      ).toContainText("|");
    });

    test("shows only the file format when the file size is not known", async ({
      page,
    }) => {
      const unsizedFile = summaryRow(
        summaryCard(page, "Other evidence"),
        "claim-evidence-2.pdf",
      );

      await expect(
        unsizedFile.getByRole("link", {
          name: "Download claim-evidence-2.pdf (pdf)",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("has no accessibility violations", async ({
      page,
      checkAccessibility,
    }) => {
      await expect(page.getByTestId("assessed-claim")).toBeVisible();
      await checkAccessibility();
    });
  });
}

test.describe("Assessed claim page - final bill cost breakdown", () => {
  const rejectedFinalBill = assessedClaimCases[1];
  const assessedPage = claimPage(rejectedFinalBill.claimReference);

  test("shows the cost breakdown as a download only row with format and size", async ({
    page,
  }) => {
    await page.goto(assessedPage);

    const costBreakdownRow = summaryRow(
      summaryCard(page, "Claim cost breakdown"),
      "final_bill_costs.xlsx",
    );

    await expect(
      costBreakdownRow.getByRole("link", { name: /^View / }),
    ).toHaveCount(0);
    await expect(costBreakdownRow).not.toContainText("|");
    await expect(
      costBreakdownRow.getByRole("link", {
        name: "Download final_bill_costs.xlsx (xlsx 20KB)",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      `${assessedPage}/evidence/3fa85f64-5717-4562-b3fc-2c963f66afa6?disposition=attachment`,
    );
  });
});
