import { strict as assert } from "assert";
import { ProcessClaimAssessmentUseCase } from "#src/use-cases/applications/claims/ProcessClaimAssessment.useCase.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

describe("ProcessClaimAssessmentUseCase", () => {
  const useCase = new ProcessClaimAssessmentUseCase();

  it("returns VALIDATION_FAILED with errors and the posted form data", () => {
    const errors = {
      rejectionReason: {
        text: en.pages.claimAssessment.radio.validationErrors.reasonNotEmpty,
      },
    };

    const result = useCase.execute({
      assessClaim: "reject",
      rejectionReason: "",
      validate: () => errors,
    });

    assert.equal(result.status, "VALIDATION_FAILED");
    assert.deepEqual(result.validationErrors, errors);
    assert.deepEqual(result.data, {
      assessClaim: "reject",
      rejectionReason: "",
    });
  });

  it("returns SUCCESS with the posted form data", () => {
    const result = useCase.execute({
      assessClaim: "reject",
      rejectionReason: "Not enough supporting evidence provided",
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      assessClaim: "reject",
      rejectionReason: "Not enough supporting evidence provided",
    });
  });
});
