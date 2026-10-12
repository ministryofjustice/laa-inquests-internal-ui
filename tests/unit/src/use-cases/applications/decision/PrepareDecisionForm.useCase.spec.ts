import { strict as assert } from "assert";
import { PrepareDecisionFormUseCase } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

describe("PrepareDecisionFormUseCase", () => {
  const useCase = new PrepareDecisionFormUseCase();

  it("returns an empty display value for a null merits status", () => {
    const result = useCase.execute({
      application: {
        proceeding: { certificateType: "SUBSTANTIVE" },
        overallDecision: null,
      } as any,
    });

    assert.partialDeepStrictEqual(result, {
      status: "SUCCESS",
      data: { proceeding: { meritsDecision: "" } },
    });
  });

  it("returns SUCCESS with formatted proceeding and selected session decision", () => {
    const result = useCase.execute({
      application: {
        proceeding: { certificateType: "SUBSTANTIVE" },
        overallDecision: "SUBMITTED",
      } as any,
      sessionDecision: { overallDecision: "REFUSED" },
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      proceeding: {
        certificateType: "Substantive",
        meritsDecision: "Submitted",
      },
      selectedOverallDecision: "REFUSED",
    });
  });
});
