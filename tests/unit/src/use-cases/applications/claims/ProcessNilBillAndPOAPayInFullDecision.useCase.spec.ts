import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { ProcessNilBillAndPOAPayInFullDecisionUseCase } from "#src/use-cases/applications/claims/ProcessNilBillAndPOAPayInFullDecision.useCase.js";
import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";

const baseClaim: ClaimDetail = {
  claimReference: "INQC-0010-0010",
  claimTypeId: "FINAL_BILL",
  submissionDate: "2026-08-11T12:52:29.677Z",
  totalFundsRemainingAfterClaim: "8800.00",
};

describe("ProcessNilBillAndPOAPayInFullDecisionUseCase", () => {
  it("returns NOT_FOUND when the claim cannot be found", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves(undefined);

    const result = await new ProcessNilBillAndPOAPayInFullDecisionUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "NOT_FOUND" });
    assert.equal(claimsPortStub.payInFullClaim.callCount, 0);
  });

  it("returns CONTINUE_JOURNEY for a final bill", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "FINAL_BILL",
    });

    const result = await new ProcessNilBillAndPOAPayInFullDecisionUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
    });

    assert.deepEqual(result, { status: "CONTINUE_JOURNEY" });
    assert.equal(claimsPortStub.payInFullClaim.callCount, 0);
  });

  it("submits an empty pay-in-full decision and returns SUCCESS for a Nil bill claim", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "NIL_BILL",
    });
    claimsPortStub.payInFullClaim.resolves({ status: "SUCCESS" });

    const result = await new ProcessNilBillAndPOAPayInFullDecisionUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "SUCCESS" });
    assert.equal(claimsPortStub.payInFullClaim.callCount, 1);
    assert.deepEqual(claimsPortStub.payInFullClaim.getCall(0).args, [
      "123",
      "INQC-0010-0010",
      {},
      "access-token-123",
    ]);
  });

  it("submits an empty pay-in-full decision and returns SUCCESS for a POA claim", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "PAYMENT_ON_ACCOUNT",
      statusId: "SUBMITTED",
    });
    claimsPortStub.payInFullClaim.resolves({ status: "SUCCESS" });

    const result = await new ProcessNilBillAndPOAPayInFullDecisionUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "SUCCESS" });
    assert.equal(claimsPortStub.payInFullClaim.callCount, 1);
    assert.deepEqual(claimsPortStub.payInFullClaim.getCall(0).args, [
      "123",
      "INQC-0010-0010",
      {},
      "access-token-123",
    ]);
  });

  it("returns VALIDATION_ERROR when the API rejects a POA pay-in-full submission", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "PAYMENT_ON_ACCOUNT",
      statusId: "SUBMITTED",
    });
    claimsPortStub.payInFullClaim.resolves({
      status: "VALIDATION_ERROR",
      errorCode: "MISSING_TOTAL_CLAIM_COST",
    });

    const result = await new ProcessNilBillAndPOAPayInFullDecisionUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
    });

    assert.deepEqual(result, {
      status: "VALIDATION_ERROR",
      errorCode: "MISSING_TOTAL_CLAIM_COST",
    });
  });

  it("returns VALIDATION_ERROR when the API rejects the Nil bill submission", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.getClaimById.resolves({
      ...baseClaim,
      claimTypeId: "NIL_BILL",
    });
    claimsPortStub.payInFullClaim.resolves({
      status: "VALIDATION_ERROR",
      errorCode: "MISSING_TOTAL_CLAIM_COST",
    });

    const result = await new ProcessNilBillAndPOAPayInFullDecisionUseCase(
      claimsPortStub,
    ).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
    });

    assert.deepEqual(result, {
      status: "VALIDATION_ERROR",
      errorCode: "MISSING_TOTAL_CLAIM_COST",
    });
  });
});
