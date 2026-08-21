import { strict as assert } from "assert";
import { ProcessPublicBodySelectionUseCase } from "#src/use-cases/applications/publicBodies/ProcessPublicBodySelection.useCase.js";

describe("ProcessPublicBodySelectionUseCase", () => {
  const useCase = new ProcessPublicBodySelectionUseCase();

  it("returns SUCCESS with a normalised array when multiple public bodies are selected", () => {
    const result = useCase.execute({
      publicBodyOption: ["Cabinet Office", "Department for Transport"],
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicBodyIds: ["Cabinet Office", "Department for Transport"],
    });
  });

  it("normalises a single selected public body to an array", () => {
    const result = useCase.execute({
      publicBodyOption: "Cabinet Office",
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicBodyIds: ["Cabinet Office"],
    });
  });

  it("returns VALIDATION_FAILED when no public body is selected", () => {
    const validationErrors = {
      noPublicBodySelected: { text: "Select at least one public authority" },
    };

    const result = useCase.execute({
      publicBodyOption: undefined,
      validate: () => validationErrors,
    });

    assert.equal(result.status, "VALIDATION_FAILED");
    if (result.status === "VALIDATION_FAILED") {
      assert.deepEqual(result.validationErrors, validationErrors);
      assert.deepEqual(result.data, { selectedPublicBodyIds: [] });
    }
  });
});
