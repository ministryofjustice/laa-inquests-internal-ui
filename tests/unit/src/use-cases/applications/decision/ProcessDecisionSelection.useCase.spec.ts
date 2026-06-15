import { strict as assert } from "assert";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { ProcessDecisionSelectionUseCase } from "#src/use-cases/applications/decision/ProcessDecisionSelection.useCase.js";

describe("ProcessDecisionSelectionUseCase", () => {
  const useCase = new ProcessDecisionSelectionUseCase();

  it("returns VALIDATION_FAILED when decision validation errors exist", () => {
    const errors = {
      overallDecision: {
        text: en.pages.decision.merits.radio.validationError.notEmpty,
      },
    };

    const result = useCase.execute({
      overallDecision: "",
      validate: () => errors,
    });

    assert.equal(result.status, "VALIDATION_FAILED");
    assert.deepEqual(result.validationErrors, errors);
    assert.deepEqual(result.data, { overallDecision: "" });
  });

  it("returns SUCCESS with normalized selection payload", () => {
    const result = useCase.execute({
      overallDecision: "REFUSED",
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, { overallDecision: "REFUSED" });
  });
});
