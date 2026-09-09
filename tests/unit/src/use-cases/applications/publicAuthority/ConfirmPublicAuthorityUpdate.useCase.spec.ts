import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { ConfirmPublicAuthorityUpdateUseCase } from "#src/use-cases/applications/publicAuthority/ConfirmPublicAuthorityUpdate.useCase.js";

describe("ConfirmPublicAuthorityUpdateUseCase", () => {
  it("returns SUCCESS after updating public authorities with valid inputs", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.updateApplicationPublicBodies.resolves();
    const useCase = new ConfirmPublicAuthorityUpdateUseCase(
      applicationPortStub,
    );

    const result = await useCase.execute({
      laaReference: "123",
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

  it("returns INVALID_INPUT when laaReference is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new ConfirmPublicAuthorityUpdateUseCase(
      applicationPortStub,
    );

    const result = await useCase.execute({
      laaReference: "",
      selectedPublicAuthorityIds: ["Cabinet Office"],
    });

    assert.equal(result.status, "INVALID_INPUT");
    assert.equal(
      result.message,
      "Cannot update public authorities without laaReference or selected public authorities",
    );
  });

  it("returns INVALID_INPUT when selectedPublicAuthorityIds is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new ConfirmPublicAuthorityUpdateUseCase(
      applicationPortStub,
    );

    const result = await useCase.execute({
      laaReference: "123",
      selectedPublicAuthorityIds: [],
    });

    assert.equal(result.status, "INVALID_INPUT");
    assert.equal(
      result.message,
      "Cannot update public authorities without laaReference or selected public authorities",
    );
  });

  it("propagates upstream errors unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("Upstream error");
    applicationPortStub.updateApplicationPublicBodies.rejects(error);
    const useCase = new ConfirmPublicAuthorityUpdateUseCase(
      applicationPortStub,
    );

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        selectedPublicAuthorityIds: ["Cabinet Office"],
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
