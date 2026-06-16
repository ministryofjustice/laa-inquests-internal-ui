import { strict as assert } from "assert";
import { PrepareConfirmationViewUseCase } from "#src/use-cases/applications/decision/PrepareConfirmationView.useCase.js";

describe("PrepareConfirmationViewUseCase", () => {
  const useCase = new PrepareConfirmationViewUseCase();

  it("returns SUCCESS with mapped refusal reason label", () => {
    const result = useCase.execute({
      decisionSessionData: {
        overallDecision: "REFUSED",
        refusalReason: "not-in-scope",
        justification: "insufficient evidence",
      },
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      proceeding: {
        overallDecision: "REFUSED",
        refusalReason: "not-in-scope",
        justification: "insufficient evidence",
      },
      overallDecision: "REFUSED",
      refusalReasonLabel: "Not in scope",
      justification: "insufficient evidence",
    });
  });

  it("falls back to raw refusal reason when label is unknown", () => {
    const result = useCase.execute({
      decisionSessionData: {
        refusalReason: "other",
      },
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.refusalReasonLabel, "other");
  });
});
