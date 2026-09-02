import { strict as assert } from "assert";
import { ClaimDetailSchema } from "#src/adaptors/models/claim.schema.js";

const baseClaim = {
  claimId: 10,
  claimTypeId: "PAYMENT_ON_ACCOUNT",
  submissionDate: "2026-08-11T12:52:29.677Z",
  totalProfitCostNet: "1000.00",
  totalProfitCostGross: "1200.00",
  totalProfitCostVatZero: null,
  totalFundsRemainingAfterClaim: "8800.00",
  poaTypeId: "PROFIT_COST",
  statusId: "SUBMITTED",
};

describe("ClaimDetailSchema", () => {
  it("parses a rejected claim with reason code and justification objects", () => {
    const claim = {
      ...baseClaim,
      claimDecision: {
        claimDecisionId: 1,
        decision: "REJECT",
        decisionReasons: [
          { reasonCode: "MANUAL_REJECTION", justification: "reject" },
        ],
      },
    };

    const result = ClaimDetailSchema.parse(claim);

    assert.deepEqual(result.claimDecision?.decisionReasons, [
      { reasonCode: "MANUAL_REJECTION", justification: "reject" },
    ]);
  });

  it("defaults decisionReasons to an empty array when omitted", () => {
    const claim = {
      ...baseClaim,
      claimDecision: {
        claimDecisionId: 2,
        decision: "PENDING",
      },
    };

    const result = ClaimDetailSchema.parse(claim);

    assert.deepEqual(result.claimDecision?.decisionReasons, []);
  });

  it("accepts non-REJECT decisions with empty decisionReasons", () => {
    const claim = {
      ...baseClaim,
      claimDecision: {
        claimDecisionId: 3,
        decision: "GRANT",
        decisionReasons: [],
      },
    };

    const result = ClaimDetailSchema.parse(claim);

    assert.equal(result.claimDecision?.decision, "GRANT");
    assert.deepEqual(result.claimDecision?.decisionReasons, []);
  });

  it("accepts a string number of instructed counsel", () => {
    const result = ClaimDetailSchema.parse({
      ...baseClaim,
      numberOfCounselInstructed: "1",
    });

    assert.equal(result.numberOfCounselInstructed, "1");
  });

  it("rejects a decision reason missing justification", () => {
    const claim = {
      ...baseClaim,
      claimDecision: {
        claimDecisionId: 4,
        decision: "REJECT",
        decisionReasons: [{ reasonCode: "MANUAL_REJECTION" }],
      },
    };

    const result = ClaimDetailSchema.safeParse(claim);

    assert.equal(result.success, false);
  });

  it("rejects a decision reason missing reasonCode", () => {
    const claim = {
      ...baseClaim,
      claimDecision: {
        claimDecisionId: 5,
        decision: "REJECT",
        decisionReasons: [{ justification: "reject" }],
      },
    };

    const result = ClaimDetailSchema.safeParse(claim);

    assert.equal(result.success, false);
  });
});
