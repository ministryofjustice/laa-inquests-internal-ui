import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { AddHistoryNoteUseCase } from "#src/use-cases/applications/history/AddHistoryNote.useCase.js";

describe("AddHistoryNoteUseCase", () => {
  const useCase = new AddHistoryNoteUseCase();

  it("returns TECHNICAL_FAILURE when applicationId is missing", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "",
      noteText: "A note",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns SUCCESS after submitting a history note", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.addHistoryNote.resolves();

    const result = await useCase.execute({
      applicationId: "123",
      noteText: "This is a case note",
      applicationPort: applicationPortStub,
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(applicationPortStub.addHistoryNote.callCount, 1);
    assert.deepEqual(applicationPortStub.addHistoryNote.getCall(0).args, [
      "123",
      "access-token-123",
      "This is a case note",
    ]);
  });

  it("returns TECHNICAL_FAILURE when upstream submission fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.addHistoryNote.rejects(new Error("boom"));

    const result = await useCase.execute({
      applicationId: "123",
      noteText: "A note",
      applicationPort: applicationPortStub,
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "UPSTREAM_REJECTED");
  });
});
