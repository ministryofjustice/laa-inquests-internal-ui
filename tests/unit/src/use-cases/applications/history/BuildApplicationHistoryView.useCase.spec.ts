import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import { BuildApplicationHistoryViewUseCase } from "#src/use-cases/applications/history/BuildApplicationHistoryView.useCase.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";

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
      applicationId: "123",
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
      applicationId: "123",
      applicationPort: applicationPortStub,
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data.history, []);
  });

  it("returns TECHNICAL_FAILURE when applicationId is missing", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();

    const result = await useCase.execute({
      applicationId: "",
      applicationPort: applicationPortStub,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE);
    assert.equal(
      result.message,
      "Cannot build application history view without an applicationId",
    );
    assert.equal(applicationPortStub.getApplicationHistory.callCount, 0);
  });

  it("returns TECHNICAL_FAILURE with UPSTREAM_REJECTED when API call fails", async () => {
    const applicationPortStub = stubInterface<ApplicationPort>();
    const apiError = new Error("API connection failed");
    applicationPortStub.getApplicationHistory.rejects(apiError);

    const result = await useCase.execute({
      applicationId: "123",
      applicationPort: applicationPortStub,
      accessToken: "access-token-123",
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED);
    assert.equal(result.cause, apiError);
  });
});
