import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildApplicationHistoryViewUseCase } from "#src/use-cases/applications/history/BuildApplicationHistoryView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("BuildApplicationHistoryViewUseCase", () => {
  const useCase = new BuildApplicationHistoryViewUseCase();

  const mockHistory = [
    {
      timestamp: "2026-05-21T10:30:00.000Z",
      actor: "System",
      eventReference: "EVT-BUS-APP-001",
      eventData: null,
    },
    {
      timestamp: "2026-05-22T14:15:00.000Z",
      actor: "Jane Smith",
      eventReference: "EVT-BUS-APP-002",
      eventData: { meritsDecision: "granted" },
    },
  ];

  it("returns SUCCESS with history data from the application port", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.getApplicationHistory.resolves(mockHistory as any);

    const result = await useCase.execute({
      laaReference: "123",
      applicationPort: applicationPortStub,
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.history, mockHistory);
    assert.equal(applicationPortStub.getApplicationHistory.callCount, 1);
    assert.deepEqual(
      applicationPortStub.getApplicationHistory.getCall(0).args,
      ["123", "access-token-123"],
    );
  });

  it("returns SUCCESS with empty history array when no history exists", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    applicationPortStub.getApplicationHistory.resolves([]);

    const result = await useCase.execute({
      laaReference: "123",
      applicationPort: applicationPortStub,
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.history, []);
  });

  it("returns INVALID_INPUT when laaReference is missing", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      laaReference: "",
      applicationPort: applicationPortStub,
    });

    assert.deepEqual(result, { status: "INVALID_INPUT" });
    assert.equal(applicationPortStub.getApplicationHistory.callCount, 0);
  });

  it("propagates application errors from the port unchanged", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const apiError = new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      "get_application_history",
      true,
    );
    applicationPortStub.getApplicationHistory.rejects(apiError);

    await assert.rejects(
      useCase.execute({
        laaReference: "123",
        applicationPort: applicationPortStub,
        accessToken: "access-token-123",
      }),
      (thrown: unknown) => thrown === apiError,
    );
  });
});
