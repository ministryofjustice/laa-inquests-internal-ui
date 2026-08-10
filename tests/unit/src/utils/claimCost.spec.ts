import { expect } from "chai";
import type { Claim } from "#src/adaptors/models/claim.types.js";
import { getClaimCost } from "#src/utils/claimCost.js";

function buildClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    claimId: 1,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-10T13:37:56.629563",
    totalProfitCostNet: null,
    totalProfitCostGross: null,
    totalProfitCostVatZero: null,
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    claimDecisionStatus: null,
    ...overrides,
  };
}

describe("getClaimCost()", () => {
  it("uses the gross total for a 20% VAT claim", () => {
    const claim = buildClaim({
      totalProfitCostNet: "1000.00",
      totalProfitCostGross: "1200.00",
    });

    expect(getClaimCost(claim)).to.equal(1200);
  });

  it("uses the vat zero total for a 0% VAT claim", () => {
    const claim = buildClaim({
      totalProfitCostGross: null,
      totalProfitCostVatZero: "800.00",
    });

    expect(getClaimCost(claim)).to.equal(800);
  });

  it("prefers the gross total when both gross and vat zero total are present", () => {
    const claim = buildClaim({
      totalProfitCostGross: "1200.00",
      totalProfitCostVatZero: "800.00",
    });

    expect(getClaimCost(claim)).to.equal(1200);
  });

  it("never uses the net total on its own", () => {
    const claim = buildClaim({
      totalProfitCostNet: "1000.00",
      totalProfitCostGross: null,
      totalProfitCostVatZero: null,
    });

    expect(getClaimCost(claim)).to.equal(0);
  });

  it("returns 0 when no cost fields are present", () => {
    expect(getClaimCost(buildClaim())).to.equal(0);
  });

  it("treats empty string cost values as absent", () => {
    const claim = buildClaim({
      totalProfitCostGross: "",
      totalProfitCostVatZero: "800.00",
    });

    expect(getClaimCost(claim)).to.equal(800);
  });
});
