import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildClaimRejectionViewUseCase } from "#src/use-cases/applications/claims/BuildClaimRejectionView.useCase.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";

describe("BuildClaimRejectionViewUseCase", () => {
  const baseClaim: ClaimDetail = {
    claimId: 10,
    claimTypeId: "PAYMENT_ON_ACCOUNT",
    submissionDate: "2026-08-11T12:52:29.677Z",
    totalProfitCostNet: "1000.00",
    totalProfitCostGross: "1200.00",
    totalProfitCostVatZero: null,
    totalFundsRemainingAfterClaim: "8800.00",
    poaTypeId: "PROFIT_COST",
    statusId: "SUBMITTED",
    substantiveCostLimitation: 10000,
  };

  it("maps a payment on account claim type to its label", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves(baseClaim);

    const result = await new BuildClaimRejectionViewUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimId: "10",
      accessToken: "token",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, { claimType: "Payment on account" });
  });

  it("maps a final bill claim type to its label", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "FINAL_BILL",
    });

    const result = await new BuildClaimRejectionViewUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimId: "13",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, { claimType: "Final bill" });
  });

  it("returns INVALID_CLAIM_TYPE when the claim type is not recognised", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "UNKNOWN_TYPE",
    });

    const result = await new BuildClaimRejectionViewUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "5",
      claimId: "10",
    });

    assert.deepEqual(result, { status: "INVALID_CLAIM_TYPE" });
  });

  it("returns INVALID_INPUT when ids are missing", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await new BuildClaimRejectionViewUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "",
      claimId: "",
    });

    assert.deepEqual(result, { status: "INVALID_INPUT" });
  });

  it("propagates claim lookup failures", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.rejects(new Error("boom"));

    await assert.rejects(
      new BuildClaimRejectionViewUseCase(claimsPortStub).execute({
        laaReference: "5",
        claimId: "10",
      }),
    );
  });
});
