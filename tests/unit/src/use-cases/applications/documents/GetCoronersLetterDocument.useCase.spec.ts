import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { GetCoronersLetterDocumentUseCase } from "#src/use-cases/applications/documents/GetCoronersLetterDocument.useCase.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("GetCoronersLetterDocumentUseCase", () => {
  it("returns the coroner letter from the application port", async () => {
    const applicationPort = stubInterface<ApplicationPort>();
    const document = {
      data: Buffer.from("document"),
      contentType: "application/pdf",
    };
    applicationPort.getCoronersLetterDocument.resolves(document);
    const useCase = new GetCoronersLetterDocumentUseCase(applicationPort);

    const result = await useCase.execute({
      laaReference: "123",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "SUCCESS", data: document });
    assert.deepEqual(applicationPort.getCoronersLetterDocument.firstCall.args, [
      "123",
      "access-token-123",
    ]);
  });

  it("returns NOT_FOUND when the coroner letter does not exist", async () => {
    const applicationPort = stubInterface<ApplicationPort>();
    applicationPort.getCoronersLetterDocument.resolves(undefined);
    const useCase = new GetCoronersLetterDocumentUseCase(applicationPort);

    const result = await useCase.execute({
      laaReference: "123",
      accessToken: "access-token-123",
    });

    assert.deepEqual(result, { status: "NOT_FOUND" });
  });

  it("propagates application errors from the port unchanged", async () => {
    const applicationPort = stubInterface<ApplicationPort>();
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_coroners_letter",
      true,
    );
    applicationPort.getCoronersLetterDocument.rejects(error);
    const useCase = new GetCoronersLetterDocumentUseCase(applicationPort);

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === error,
    );
  });
});
