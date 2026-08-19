import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { RejectClaimUseCase } from "#src/use-cases/applications/claims/RejectClaim.useCase.js";

describe("RejectClaimUseCase", () => {
  const useCase = new RejectClaimUseCase();

  it("returns TECHNICAL_FAILURE when input is incomplete", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();

    const result = await useCase.execute({
      applicationId: "",
      claimId: "10",
      justification: "Not enough supporting evidence provided",
      claimsPort: claimsPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
    assert.equal(claimsPortStub.rejectClaim.callCount, 0);
  });

  it("returns SUCCESS after rejecting the claim with the justification", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.rejectClaim.resolves();

    const result = await useCase.execute({
      applicationId: "123",
      claimId: "10",
      justification: "Not enough supporting evidence provided",
      claimsPort: claimsPortStub,
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

  it("returns TECHNICAL_FAILURE when upstream rejection fails", async () => {
    const claimsPortStub = stubInterface<ClaimsPort>();
    claimsPortStub.rejectClaim.rejects(new Error("fail"));

    const result = await useCase.execute({
      applicationId: "123",
      claimId: "10",
      justification: "Not enough supporting evidence provided",
      claimsPort: claimsPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
