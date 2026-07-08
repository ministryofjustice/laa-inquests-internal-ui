import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { GrantDecisionUseCase } from "#src/use-cases/applications/decision/GrantDecision.useCase.js";

describe.only("GrantDecisionUseCase", () => {
  const useCase = new GrantDecisionUseCase();

  it("returns TECHNICAL_FAILURE with INVALID_INPUT_STATE when applicationId is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "",
      applicationPort: applicationPortStub,
      certificateStartDate: "2024-01-01",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
    assert.equal(
      result.message,
      "Cannot grant a decision without applicationId or certificateStartDate",
    );
  });

  it("returns TECHNICAL_FAILURE with INVALID_INPUT_STATE when certificateStartDate is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "1",
      applicationPort: applicationPortStub,
      certificateStartDate: "",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
    assert.equal(
      result.message,
      "Cannot grant a decision without applicationId or certificateStartDate",
    );
  });

  it("returns SUCCESS after submitting grant decision with valid applicationId and certificateStartDate", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitGrantDecision.resolves();

    const result = await useCase.execute({
      applicationId: "123",
      applicationPort: applicationPortStub,
      certificateStartDate: "2024-01-01",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(applicationPortStub.submitGrantDecision.callCount, 1);
    assert.deepEqual(applicationPortStub.submitGrantDecision.getCall(0).args, [
      "123",
      "access-token-123",
      "2024-01-01",
    ]);
  });

  it("returns TECHNICAL_FAILURE with UPSTREAM_REJECTED when submitGrantDecision throws an error", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("Upstream error");
    applicationPortStub.submitGrantDecision.rejects(error);

    const result = await useCase.execute({
      applicationId: "123",
      applicationPort: applicationPortStub,
      certificateStartDate: "2024-01-01",
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
    assert.equal(result.cause, error);
  });
});
