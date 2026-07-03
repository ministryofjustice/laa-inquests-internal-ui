import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { RefuseDecisionUseCase } from "#src/use-cases/applications/decision/RefuseDecision.useCase.js";

describe("RefuseDecisionUseCase", () => {
  const useCase = new RefuseDecisionUseCase();

  it("returns TECHNICAL_FAILURE when input is incomplete", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "",
      applicationPort: applicationPortStub,
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns SUCCESS after submitting refusal decision with refusalReason and justification", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitRefuseDecision.resolves();

    const result = await useCase.execute({
      applicationId: "123",
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
      applicationPort: applicationPortStub,
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

  it("returns TECHNICAL_FAILURE when upstream submission fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitRefuseDecision.rejects(new Error("boom"));

    const result = await useCase.execute({
      applicationId: "123",
      applicationPort: applicationPortStub,
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
