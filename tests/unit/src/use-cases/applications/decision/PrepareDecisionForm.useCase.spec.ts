import { strict as assert } from "assert";
import { PrepareDecisionFormUseCase } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

describe("PrepareDecisionFormUseCase", () => {
  const useCase = new PrepareDecisionFormUseCase();

  it("returns TECHNICAL_FAILURE when application has no proceedings", () => {
    const result = useCase.execute({
      application: {
        proceedings: [],
        overallDecision: "PENDING",
      } as any,
    });

    assert.equal(result.status, "TECHNICAL_FAILURE");
    assert.equal(result.reason, "INVALID_INPUT_STATE");
  });

  it("returns SUCCESS with formatted proceeding and selected session decision", () => {
    const result = useCase.execute({
      application: {
        proceedings: [{ certificateType: "SUBSTANTIVE" }],
        overallDecision: "PENDING",
      } as any,
      sessionDecision: { overallDecision: "REFUSED" },
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      proceeding: {
        certificateType: "Substantive",
        meritsDecision: "Pending",
      },
      selectedOverallDecision: "REFUSED",
    });
  });
});
