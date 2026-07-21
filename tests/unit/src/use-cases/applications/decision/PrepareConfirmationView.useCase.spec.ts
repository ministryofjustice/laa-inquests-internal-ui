import { strict as assert } from "assert";
import { PrepareConfirmationViewUseCase } from "#src/use-cases/applications/decision/PrepareConfirmationView.useCase.js";
import { GRANTED_DECISION } from "#src/infrastructure/locales/constants.js";

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
      certificateStartDate: undefined,
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

  it("formats the certificate start date for a granted decision", () => {
    const result = useCase.execute({
      decisionSessionData: {
        overallDecision: GRANTED_DECISION,
        certificateStartDateDay: "1",
        certificateStartDateMonth: "1",
        certificateStartDateYear: "2020",
      },
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.data.certificateStartDate, "01 January 2020");
  });
});
