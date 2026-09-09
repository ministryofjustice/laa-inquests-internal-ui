import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { RefuseDecisionUseCase } from "#src/use-cases/applications/decision/RefuseDecision.useCase.js";

describe("RefuseDecisionUseCase", () => {
  it("returns INVALID_INPUT when input is incomplete", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new RefuseDecisionUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "",
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
    });

    assert.equal(result.status, "INVALID_INPUT");
  });

  it("returns SUCCESS after submitting refusal decision with refusalReason and justification", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitRefuseDecision.resolves();
    const useCase = new RefuseDecisionUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "123",
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(applicationPortStub.submitRefuseDecision.callCount, 1);
    assert.deepEqual(applicationPortStub.submitRefuseDecision.getCall(0).args, [
      "123",
      "access-token-123",
      "not-in-scope",
      "This case is not in scope",
    ]);
  });

  it("propagates upstream errors unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("boom");
    applicationPortStub.submitRefuseDecision.rejects(error);
    const useCase = new RefuseDecisionUseCase(applicationPortStub);

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        refusalReason: "not-in-scope",
        justification: "This case is not in scope",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
