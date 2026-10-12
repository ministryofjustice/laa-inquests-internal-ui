import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import { RetrieveApplicationReferenceUseCase } from "#src/use-cases/applications/claims/RetrieveApplicationReference.useCase.js";

describe("RetrieveApplicationReferenceUseCase", () => {
  it("returns the application reference for the claim", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    claimsPort.getApplicationReferenceByClaimReference.resolves("INQ-WAU-X9A");
    const useCase = new RetrieveApplicationReferenceUseCase(claimsPort);

    const result = await useCase.execute({
      claimReference: "INQC-ELTH-NV70",
      accessToken: "test-token",
    });

    assert.deepEqual(result, {
      status: "SUCCESS",
      laaReference: "INQ-WAU-X9A",
    });

    assert.equal(
      claimsPort.getApplicationReferenceByClaimReference.calledOnceWithExactly(
        "INQC-ELTH-NV70",
        "test-token",
      ),
      true,
    );
  });

  it("returns NOT_FOUND when no application is associated with the claim", async () => {
    const claimsPort = stubInterface<ClaimsPort>();
    claimsPort.getApplicationReferenceByClaimReference.resolves(undefined);
    const useCase = new RetrieveApplicationReferenceUseCase(claimsPort);

    const result = await useCase.execute({
      claimReference: "INQC-ELTH-NV70",
      accessToken: "test-token",
    });

    assert.deepEqual(result, { status: "NOT_FOUND" });
    assert.equal(
      claimsPort.getApplicationReferenceByClaimReference.calledOnceWithExactly(
        "INQC-ELTH-NV70",
        "test-token",
      ),
      true,
    );
  });
});
