import { strict as assert } from "assert";
import { PrepareDecisionFormUseCase } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

describe("PrepareDecisionFormUseCase", () => {
  const useCase = new PrepareDecisionFormUseCase();

  it("returns SUCCESS with formatted proceeding and selected session decision", () => {
    const result = useCase.execute({
      application: {
        proceeding: { certificateType: "SUBSTANTIVE" },
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
