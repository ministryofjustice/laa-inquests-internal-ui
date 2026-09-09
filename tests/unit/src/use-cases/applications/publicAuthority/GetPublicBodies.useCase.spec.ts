import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { GetPublicBodiesUseCase } from "#src/use-cases/applications/publicAuthority/GetPublicBodies.useCase.js";

describe("GetPublicBodiesUseCase", () => {
  it("returns public bodies from the application port", async () => {
    const applicationPort = stubInterface<ApplicationPort>();
    const publicBodies = [
      {
        publicBodyId: "Cabinet Office",
        publicBodyDescription: "Cabinet Office",
      },
    ];
    applicationPort.getPublicBodies.resolves(publicBodies);
    const useCase = new GetPublicBodiesUseCase(applicationPort);

    const result = await useCase.execute("access-token");

    assert.deepEqual(result, publicBodies);
    assert.deepEqual(applicationPort.getPublicBodies.firstCall.args, [
      "access-token",
    ]);
  });

  it("propagates application errors unchanged", async () => {
    const applicationPort = stubInterface<ApplicationPort>();
    const error = new Error("upstream failed");
    applicationPort.getPublicBodies.rejects(error);
    const useCase = new GetPublicBodiesUseCase(applicationPort);

    await assert.rejects(
      useCase.execute(),
      (thrown: unknown) => thrown === error,
    );
  });
});
