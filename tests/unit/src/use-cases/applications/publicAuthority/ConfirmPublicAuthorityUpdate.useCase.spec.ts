import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { ConfirmPublicAuthorityUpdateUseCase } from "#src/use-cases/applications/publicAuthority/ConfirmPublicAuthorityUpdate.useCase.js";

describe("ConfirmPublicAuthorityUpdateUseCase", () => {
  const useCase = new ConfirmPublicAuthorityUpdateUseCase();

  it("returns SUCCESS after updating public authorities with valid inputs", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.updateApplicationPublicBodies.resolves();

    const result = await useCase.execute({
      laaReference: "123",
      applicationPort: applicationPortStub,
      selectedPublicAuthorityIds: [
        "Cabinet Office",
        "Department for Transport",
      ],
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(
      applicationPortStub.updateApplicationPublicBodies.callCount,
      1,
    );
    assert.deepEqual(
      applicationPortStub.updateApplicationPublicBodies.getCall(0).args,
      [
        "123",
        "access-token-123",
        ["Cabinet Office", "Department for Transport"],
      ],
    );
  });

  it("returns TECHNICAL_FAILURE with INVALID_INPUT_STATE when laaReference is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      laaReference: "",
      applicationPort: applicationPortStub,
      selectedPublicAuthorityIds: ["Cabinet Office"],
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
    assert.equal(
      result.message,
      "Cannot update public authorities without laaReference or selected public authorities",
    );
  });

  it("returns TECHNICAL_FAILURE with INVALID_INPUT_STATE when selectedPublicAuthorityIds is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      laaReference: "123",
      applicationPort: applicationPortStub,
      selectedPublicAuthorityIds: [],
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
    assert.equal(
      result.message,
      "Cannot update public authorities without laaReference or selected public authorities",
    );
  });

  it("returns TECHNICAL_FAILURE with UPSTREAM_REJECTED when updateApplicationPublicBodies throws an error", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("Upstream error");
    applicationPortStub.updateApplicationPublicBodies.rejects(error);

    const result = await useCase.execute({
      laaReference: "123",
      applicationPort: applicationPortStub,
      selectedPublicAuthorityIds: ["Cabinet Office"],
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
    assert.equal(result.cause, error);
  });
});
