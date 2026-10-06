import { expect } from "chai";
import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import { getClaimCost } from "#src/utils/claim.js";
import { formatAmount } from "#src/use-cases/applications/claims/BuildClaimAssessmentView.useCase.js";
import { formatCurrency } from "#src/utils/formatter.js";

function buildClaim(overrides: Partial<ClaimSummary> = {}): ClaimSummary {
  return {
    claimReference: "INQC-0001-0001",
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-10T13:37:56.629563",
    totalProfitCostNet: null,
    totalProfitCostGross: null,
    totalProfitCostVatZero: null,
    totalAmount: "0.00",
    totalFundsRemainingAfterClaim: "0.00",
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    claimDecisionStatus: null,
    ...overrides,
  };
}

describe("getClaimCost()", () => {
  it("parses the resolved total amount", () => {
    const claim = buildClaim({ totalAmount: "1200.00" });

    expect(getClaimCost(claim)).to.equal(1200);
  });

  it("returns 0 when the total amount is unparsable", () => {
    const claim = buildClaim({ totalAmount: "not-a-number" });

    expect(getClaimCost(claim)).to.equal(0);
  });

  it("returns 0 when the total amount is an empty string", () => {
    const claim = buildClaim({ totalAmount: "" });

    expect(getClaimCost(claim)).to.equal(0);
  });
});

describe("Claims tab total and Assess page payment amount parity", () => {
  const scenarios = [
    {
      name: "VAT-zero only",
      totalProfitCostVatZero: "800.00",
      totalProfitCostGross: null,
      totalAmount: "800.00",
    },
    {
      name: "VAT-zero plus gross 0.00",
      totalProfitCostVatZero: "800.00",
      totalProfitCostGross: "0.00",
      totalAmount: "800.00",
    },
    {
      name: "VAT-zero plus gross 1320.00",
      totalProfitCostVatZero: "800.00",
      totalProfitCostGross: "1320.00",
      totalAmount: "1320.00",
    },
    {
      name: "net plus gross",
      totalProfitCostNet: "1000.00",
      totalProfitCostGross: "1200.00",
      totalAmount: "1200.00",
    },
  ];

  for (const scenario of scenarios) {
    it(`matches for ${scenario.name}`, () => {
      const claim = buildClaim(scenario);

      const claimsTabTotal = formatCurrency(getClaimCost(claim));
      const assessPagePaymentAmount = formatAmount(claim.totalAmount);

      expect(claimsTabTotal).to.equal(assessPagePaymentAmount);
    });
  }
});
