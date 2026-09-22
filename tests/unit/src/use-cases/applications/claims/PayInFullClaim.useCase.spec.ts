import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { PayInFullClaimUseCase } from "#src/use-cases/applications/claims/PayInFullClaim.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("PayInFullClaimUseCase", () => {
  it("returns INVALID_INPUT when input is incomplete", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await new PayInFullClaimUseCase(claimsPortStub).execute({
      laaReference: "",
      claimReference: "INQC-0010-0010",
      data: { profitCostNet: 1000 },
    });

    assert.deepEqual(result, { status: "INVALID_INPUT" });
    assert.equal(claimsPortStub.payInFullClaim.callCount, 0);
  });

  it("returns SUCCESS after paying the claim in full with the cost data", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.payInFullClaim.resolves({ status: "SUCCESS" });

    const result = await new PayInFullClaimUseCase(claimsPortStub).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
      data: { profitCostNet: 1000, disbursementNet: 100 },
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(claimsPortStub.payInFullClaim.callCount, 1);
    assert.deepEqual(claimsPortStub.payInFullClaim.getCall(0).args, [
      "123",
      "INQC-0010-0010",
      { profitCostNet: 1000, disbursementNet: 100 },
      "access-token-123",
    ]);
  });

  it("propagates a VALIDATION_ERROR outcome with its error code", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.payInFullClaim.resolves({
      status: "VALIDATION_ERROR",
      errorCode: "PROFIT_COST_MIXED_VAT",
    });

    const result = await new PayInFullClaimUseCase(claimsPortStub).execute({
      laaReference: "123",
      claimReference: "INQC-0010-0010",
      data: { profitCostNet: 1000 },
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, {
      status: "VALIDATION_ERROR",
      errorCode: "PROFIT_COST_MIXED_VAT",
    });
  });

  it("propagates application errors unchanged", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "pay_in_full_claim",
      true,
    );
    claimsPortStub.payInFullClaim.rejects(error);

    await assert.rejects(
      new PayInFullClaimUseCase(claimsPortStub).execute({
        laaReference: "123",
        claimReference: "INQC-0010-0010",
        data: { profitCostNet: 1000 },
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
