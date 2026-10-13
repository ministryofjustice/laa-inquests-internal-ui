import { expect, test } from "../../fixtures/index.js";
import type { Locator, Page } from "@playwright/test";

const laaReference = "INQ-YYY-005";

interface AssessedClaimCase {
  decision: string;
  claimReference: string;
  claimStatus: string;
  paymentType: string;
  paymentAmount: string;
  profitNet: string;
  profitGross: string;
  disbursementNet: string;
  disbursementGross: string;
}

const assessedClaimCases: AssessedClaimCase[] = [
  {
    decision: "PAY_IN_FULL",
    claimReference: "INQC-0030-0030",
    claimStatus: "Pay in full",
    paymentType: "Final bill",
    paymentAmount: "£1,320",
    profitNet: "£1,000",
    profitGross: "£1,200",
    disbursementNet: "£100",
    disbursementGross: "£120",
  },
  {
    decision: "REJECT",
    claimReference: "INQC-0031-0031",
    claimStatus: "Reject",
    paymentType: "Final bill",
    paymentAmount: "£170",
    profitNet: "-",
    profitGross: "-",
    disbursementNet: "-",
    disbursementGross: "-",
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

    test("shows the overview of the claim", async ({
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
    });

    test("shows the details from the assessment before the claim details", async ({
      page,
    }) => {
      const sections = page
        .getByTestId("assessed-claim")
        .getByRole("heading", { level: 2 });

      await expect(sections.first()).toHaveText("Details from the assessment");
      const titles = await sections.allTextContents();
      expect(titles.slice(0, 5).map((title) => title.trim())).toStrictEqual([
        "Details from the assessment",
        "Total profit costs",
        "Total disbursement costs",
        "Claim details",
        "Overview of the claim",
      ]);
    });

    test("shows the assessed profit and disbursement amounts", async ({
      page,
    }) => {
      const profit = summaryCard(page, "Total profit costs");
      const disbursement = summaryCard(page, "Total disbursement costs");
      const value = ".govuk-summary-list__value";

      await expect(profit.locator(".govuk-summary-list__row")).toHaveCount(2);
      await expect(
        summaryRow(profit, "Net total for profit costs excluding VAT").locator(
          value,
        ),
      ).toHaveText(assessed.profitNet);
      await expect(
        summaryRow(
          profit,
          "Gross total for profit costs including VAT",
        ).locator(value),
      ).toHaveText(assessed.profitGross);

      await expect(
        disbursement.locator(".govuk-summary-list__row"),
      ).toHaveCount(2);
      await expect(
        summaryRow(
          disbursement,
          "Net total for disbursement costs excluding VAT",
        ).locator(value),
      ).toHaveText(assessed.disbursementNet);
      await expect(
        summaryRow(
          disbursement,
          "Gross total for disbursement costs including VAT",
        ).locator(value),
      ).toHaveText(assessed.disbursementGross);
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

    test("splits every table evenly between the label and value columns", async ({
      page,
    }) => {
      for (const title of [
        "Total profit costs",
        "Total disbursement costs",
        "Overview of the claim",
        "Other evidence",
      ]) {
        const row = summaryRow(summaryCard(page, title), "").first();
        const rowBox = await row.boundingBox();
        const valueBox = await row
          .locator(".govuk-summary-list__value")
          .boundingBox();

        expect(
          Math.abs(
            (valueBox?.x ?? 0) - (rowBox?.x ?? 0) - (rowBox?.width ?? 0) / 2,
          ),
          title,
        ).toBeLessThanOrEqual(1);
      }
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

test.describe("Assessed claim page - claim paid at 0% VAT", () => {
  test("shows dashes for net and gross and no 0% VAT rows", async ({
    page,
  }) => {
    await page.goto(claimPage("INQC-0032-0032"));

    for (const title of ["Total profit costs", "Total disbursement costs"]) {
      const card = summaryCard(page, title);

      await expect(card.locator(".govuk-summary-list__row")).toHaveCount(2);
      await expect(card.locator(".govuk-summary-list__value")).toHaveText([
        "-",
        "-",
      ]);
      await expect(card.getByText("0% VAT")).toHaveCount(0);
    }
  });
});
