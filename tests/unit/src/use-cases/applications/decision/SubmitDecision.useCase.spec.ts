import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { SubmitDecisionUseCase } from "#src/use-cases/applications/decision/SubmitDecision.useCase.js";

describe("SubmitDecisionUseCase", () => {
  const useCase = new SubmitDecisionUseCase();

  it("returns TECHNICAL_FAILURE when input is incomplete", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "",
      overallDecision: undefined,
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns SUCCESS after submitting merits decision with refusalReason and justification", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitMeritsDecision.resolves();

    const result = await useCase.execute({
      applicationId: "123",
      overallDecision: "REFUSED",
      refusalReason: "not-in-scope",
      justification: "This case is not in scope",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(applicationPortStub.submitMeritsDecision.callCount, 1);
    assert.deepEqual(applicationPortStub.submitMeritsDecision.getCall(0).args, [
      "123",
      "REFUSED",
      {
        refusalReason: "not-in-scope",
        justification: "This case is not in scope",
      },
    ]);
  });

  //TODO: This will actually return another status as these fields are required for a refuse decision after changes to the API. Should we validate on the UI side too?
  it("returns SUCCESS after submitting merits decision", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitMeritsDecision.resolves();

    const result = await useCase.execute({
      applicationId: "123",
      overallDecision: "REFUSED",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(applicationPortStub.submitMeritsDecision.callCount, 1);
    assert.deepEqual(applicationPortStub.submitMeritsDecision.getCall(0).args, [
      "123",
      "REFUSED",
      {
        justification: undefined,
        refusalReason: undefined,
      },
    ]);
  });

  it("returns TECHNICAL_FAILURE when upstream submission fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitMeritsDecision.rejects(new Error("boom"));

    const result = await useCase.execute({
      applicationId: "123",
      overallDecision: "REFUSED",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
