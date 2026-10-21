import { expect, test } from "../../fixtures/index.js";
import type { Locator, Page } from "@playwright/test";

const laaReference = "INQ-YYY-005";

interface AssessedClaimCase {
  decision: string;
  claimReference: string;
  claimStatus: string;
  paymentType: string;
  paymentAmount: string;
}

const assessedClaimCases: AssessedClaimCase[] = [
  {
    decision: "PAY_IN_FULL",
    claimReference: "INQC-0030-0030",
    claimStatus: "Pay in full",
    paymentType: "Final bill",
    paymentAmount: "£1,320",
  },
  {
    decision: "REJECT",
    claimReference: "INQC-0031-0031",
    claimStatus: "Reject",
    paymentType: "Final bill",
    paymentAmount: "£170",
  },
];

interface CostCardCase {
  title: string;
  netLabel: string;
  grossLabel: string;
  zeroVatLabel: string;
  net: string;
  gross: string;
  zeroVat: string;
}

interface AssessmentCardsCase {
  description: string;
  claimReference: string;
  profit?: Pick<CostCardCase, "net" | "gross" | "zeroVat">;
  disbursement?: Pick<CostCardCase, "net" | "gross" | "zeroVat">;
}

const profitCard = {
  title: "Total profit costs",
  netLabel: "Net total for profit costs excluding VAT",
  grossLabel: "Gross total for profit costs including VAT",
  zeroVatLabel: "Total for profit costs charged at 0% VAT",
};

const disbursementCard = {
  title: "Total disbursement costs",
  netLabel: "Net total for disbursement costs excluding VAT",
  grossLabel: "Gross total for disbursement costs including VAT",
  zeroVatLabel: "Total for disbursement costs charged at 0% VAT",
};

const assessmentCardsCases: AssessmentCardsCase[] = [
  {
    description: "final bill paid in full with profit and disbursement costs",
    claimReference: "INQC-0030-0030",
    profit: { net: "£1,000", gross: "£1,200", zeroVat: "-" },
    disbursement: { net: "£100", gross: "£120", zeroVat: "-" },
  },
  {
    description: "claim paid at 0% VAT only",
    claimReference: "INQC-0032-0032",
    profit: { net: "-", gross: "-", zeroVat: "£800" },
    disbursement: { net: "-", gross: "-", zeroVat: "£50" },
  },
  {
    description: "profit cost payment on account",
    claimReference: "INQC-0033-0033",
    profit: { net: "£1,000", gross: "£1,200", zeroVat: "-" },
  },
  {
    description: "disbursement payment on account",
    claimReference: "INQC-0034-0034",
    disbursement: { net: "£100", gross: "£120", zeroVat: "-" },
  },
  {
    description: "rejected claim",
    claimReference: "INQC-0031-0031",
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
          level: 2,
          name: `Claim status: ${assessed.claimStatus}`,
        }),
      ).toBeVisible();
    });

    test("shows the overview of the claim", async ({ page }) => {
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
      for (const title of ["Overview of the claim", "Other evidence"]) {
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

for (const assessment of assessmentCardsCases) {
  test.describe(`Assessed claim page - assessment cards - ${assessment.description}`, () => {
    const cards = [
      assessment.profit && { ...profitCard, ...assessment.profit },
      assessment.disbursement && {
        ...disbursementCard,
        ...assessment.disbursement,
      },
    ].filter((card): card is CostCardCase => Boolean(card));

    test.beforeEach(async ({ page }) => {
      await page.goto(claimPage(assessment.claimReference));
    });

    test("shows the details from the assessment before the claim details", async ({
      page,
    }) => {
      const titles = await page
        .getByTestId("assessed-claim")
        .getByRole("heading", { level: 2 })
        .allTextContents();
      const expectedTitles = [
        ...(cards.length > 0
          ? ["Details from the assessment", ...cards.map((card) => card.title)]
          : []),
        "Claim details",
        "Overview of the claim",
      ];

      expect(titles[0]?.trim()).toMatch(/^Claim status:/);
      expect(
        titles.slice(1, expectedTitles.length + 1).map((title) => title.trim()),
      ).toStrictEqual(expectedTitles);
    });

    test("only shows the cost cards that have an amount", async ({ page }) => {
      await expect(page.getByText("Details from the assessment")).toHaveCount(
        cards.length > 0 ? 1 : 0,
      );
      await expect(page.getByText("Total profit costs")).toHaveCount(
        assessment.profit ? 1 : 0,
      );
      await expect(page.getByText("Total disbursement costs")).toHaveCount(
        assessment.disbursement ? 1 : 0,
      );
    });

    for (const card of cards) {
      test(`shows the net, gross and 0% VAT rows in the ${card.title} card`, async ({
        page,
      }) => {
        const cardLocator = summaryCard(page, card.title);
        const value = ".govuk-summary-list__value";

        await expect(
          cardLocator.locator(".govuk-summary-list__row"),
        ).toHaveCount(3);
        await expect(
          summaryRow(cardLocator, card.netLabel).locator(value),
        ).toHaveText(card.net);
        await expect(
          summaryRow(cardLocator, card.grossLabel).locator(value),
        ).toHaveText(card.gross);
        await expect(
          summaryRow(cardLocator, card.zeroVatLabel).locator(value),
        ).toHaveText(card.zeroVat);
      });

      test(`splits the ${card.title} card evenly between the label and value columns`, async ({
        page,
      }) => {
        const row = summaryRow(summaryCard(page, card.title), "").first();
        const rowBox = await row.boundingBox();
        const valueBox = await row
          .locator(".govuk-summary-list__value")
          .boundingBox();

        expect(
          Math.abs(
            (valueBox?.x ?? 0) - (rowBox?.x ?? 0) - (rowBox?.width ?? 0) / 2,
          ),
        ).toBeLessThanOrEqual(1);
      });
    }
  });
}
