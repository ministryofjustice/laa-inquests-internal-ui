import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { GrantDecisionUseCase } from "#src/use-cases/applications/decision/GrantDecision.useCase.js";

describe("GrantDecisionUseCase", () => {
  it("returns INVALID_INPUT when laaReference is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new GrantDecisionUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "",
      certificateStartDate: "2024-01-01",
    });

    assert.equal(result.status, "INVALID_INPUT");
    assert.equal(
      result.message,
      "Cannot grant a decision without laaReference or certificateStartDate",
    );
  });

  it("returns INVALID_INPUT when certificateStartDate is empty", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new GrantDecisionUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "1",
      certificateStartDate: "",
    });

    assert.equal(result.status, "INVALID_INPUT");
    assert.equal(
      result.message,
      "Cannot grant a decision without laaReference or certificateStartDate",
    );
  });

  it("returns SUCCESS after submitting grant decision with valid laaReference and certificateStartDate", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.submitGrantDecision.resolves();
    const useCase = new GrantDecisionUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "123",
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

  it("propagates upstream errors unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("Upstream error");
    applicationPortStub.submitGrantDecision.rejects(error);
    const useCase = new GrantDecisionUseCase(applicationPortStub);

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        certificateStartDate: "2024-01-01",
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
