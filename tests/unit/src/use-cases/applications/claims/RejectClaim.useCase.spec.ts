import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { RejectClaimUseCase } from "#src/use-cases/applications/claims/RejectClaim.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("RejectClaimUseCase", () => {
  it("returns INVALID_INPUT when input is incomplete", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await new RejectClaimUseCase(claimsPortStub).execute({
      laaReference: "",
      claimId: "10",
      justification: "Not enough supporting evidence provided",
    });

    assert.deepEqual(result, { status: "INVALID_INPUT" });
    assert.equal(claimsPortStub.rejectClaim.callCount, 0);
  });

  it("returns SUCCESS after rejecting the claim with the justification", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.rejectClaim.resolves();

    const result = await new RejectClaimUseCase(claimsPortStub).execute({
      laaReference: "123",
      claimId: "10",
      justification: "Not enough supporting evidence provided",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(claimsPortStub.rejectClaim.callCount, 1);
    assert.deepEqual(claimsPortStub.rejectClaim.getCall(0).args, [
      "123",
      "10",
      "Not enough supporting evidence provided",
      "access-token-123",
    ]);
  });

  it("propagates application errors unchanged", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "reject_claim",
      true,
    );
    claimsPortStub.rejectClaim.rejects(error);

    await assert.rejects(
      new RejectClaimUseCase(claimsPortStub).execute({
        laaReference: "123",
        claimId: "10",
        justification: "Not enough supporting evidence provided",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
