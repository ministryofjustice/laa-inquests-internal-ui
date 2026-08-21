import { strict as assert } from "assert";
import { ProcessPublicAuthoritySelectionUseCase } from "#src/use-cases/applications/publicAuthority/ProcessPublicAuthoritySelection.useCase.js";

describe("ProcessPublicAuthoritySelectionUseCase", () => {
  const useCase = new ProcessPublicAuthoritySelectionUseCase();

  it("returns SUCCESS with a normalised array when multiple public authorities are selected", () => {
    const result = useCase.execute({
      publicAuthorityOption: ["Cabinet Office", "Department for Transport"],
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicAuthorityIds: [
        "Cabinet Office",
        "Department for Transport",
      ],
    });
  });

  it("normalises a single selected public authority to an array", () => {
    const result = useCase.execute({
      publicAuthorityOption: "Cabinet Office",
      validate: () => ({}),
    });

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.data, {
      selectedPublicAuthorityIds: ["Cabinet Office"],
    });
  });

  it("returns VALIDATION_FAILED when no public authority is selected", () => {
    const validationErrors = {
      noPublicAuthoritySelected: {
        text: "Select at least one public authority",
      },
    };

    const result = useCase.execute({
      publicAuthorityOption: undefined,
      validate: () => validationErrors,
    });

    assert.equal(result.status, "VALIDATION_FAILED");
    if (result.status === "VALIDATION_FAILED") {
      assert.deepEqual(result.validationErrors, validationErrors);
      assert.deepEqual(result.data, { selectedPublicAuthorityIds: [] });
    }
  });
});
