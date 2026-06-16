import { strict as assert } from "assert";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { ProcessJustificationUseCase } from "#src/use-cases/applications/decision/ProcessJustification.useCase.js";

describe("ProcessJustificationUseCase", () => {
  const useCase = new ProcessJustificationUseCase();

  it("returns VALIDATION_FAILED with errors and merged decision payload", () => {
    const errors = {
      decisionJustification: {
        text: en.pages.decision.justification.textarea.validationErrors
          .notEmpty,
      },
    };

    const result = useCase.execute({
      refusalReason: "not-in-scope",
      justification: "",
      validate: () => errors,
      existingSessionData: { overallDecision: "REFUSED" },
    });

    assert.equal(result.status, "VALIDATION_FAILED");
    assert.deepEqual(result.validationErrors, errors);
    assert.deepEqual(result.data, {
      overallDecision: "REFUSED",
      refusalReason: "not-in-scope",
      justification: "",
    });
  });

  it("returns SUCCESS with merged decision payload", () => {
    const result = useCase.execute({
      refusalReason: "duplicate-case",
      justification: "already decided",
      validate: () => ({}),
      existingSessionData: { overallDecision: "REFUSED" },
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      overallDecision: "REFUSED",
      refusalReason: "duplicate-case",
      justification: "already decided",
    });
  });
});
