import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { GetClaimEvidenceUseCase } from "#src/use-cases/applications/claims/GetClaimEvidence.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("GetClaimEvidenceUseCase", () => {
  it("returns evidence from the claims port", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    const evidence = {
      data: Buffer.from("evidence"),
      contentType: "application/pdf",
      contentDisposition: "inline",
    };
    claimsPort.getClaimEvidence.resolves(evidence);
    const useCase = new GetClaimEvidenceUseCase(claimsPort);

    const result = await useCase.execute({
      claimEvidenceId: "evidence-1",
      disposition: "inline",
      accessToken: "token",
    });

    assert.deepEqual(result, { status: "SUCCESS", data: evidence });
  });

  it("returns NOT_FOUND when evidence does not exist", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    claimsPort.getClaimEvidence.resolves(undefined);
    const useCase = new GetClaimEvidenceUseCase(claimsPort);
    assert.deepEqual(
      await useCase.execute({
        claimEvidenceId: "missing",
        disposition: "inline",
      }),
      { status: "NOT_FOUND" },
    );
  });

  it("propagates application errors unchanged", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_claim_evidence",
      true,
    );
    claimsPort.getClaimEvidence.rejects(error);
    const useCase = new GetClaimEvidenceUseCase(claimsPort);
    await assert.rejects(
      useCase.execute({ claimEvidenceId: "1", disposition: "inline" }),
      (thrown: unknown) => thrown === error,
    );
  });
});
