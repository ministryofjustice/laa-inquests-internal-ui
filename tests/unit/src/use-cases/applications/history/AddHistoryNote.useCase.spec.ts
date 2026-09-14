import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { AddHistoryNoteUseCase } from "#src/use-cases/applications/history/AddHistoryNote.useCase.js";

describe("AddHistoryNoteUseCase", () => {
  it("returns INVALID_INPUT when laaReference is missing", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const useCase = new AddHistoryNoteUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "",
      noteText: "A note",
    });

    assert.equal(result.status, "INVALID_INPUT");
  });

  it("returns SUCCESS after submitting a history note", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.addHistoryNote.resolves();
    const useCase = new AddHistoryNoteUseCase(applicationPortStub);

    const result = await useCase.execute({
      laaReference: "123",
      noteText: "This is a case note",
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

  it("propagates upstream errors unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const error = new Error("boom");
    applicationPortStub.addHistoryNote.rejects(error);
    const useCase = new AddHistoryNoteUseCase(applicationPortStub);

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        noteText: "A note",
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
