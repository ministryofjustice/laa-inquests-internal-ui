import { SearchClaimValidator } from "#src/adaptors/presenter/applications/SearchClaim/SearchClaim.validator.js";
import { assert } from "chai";

describe("SearchClaimValidator", () => {
  describe("validateSearchClaimForm", () => {
    it("returns no errors for a valid claim reference", () => {
      const validator = new SearchClaimValidator();

      const errors = validator.validateSearchClaimForm("INQC-ELTH-NV70");

      assert.deepEqual(errors, {});
    });

    it("returns an error for a null claim reference", () => {
      const validator = new SearchClaimValidator();

      const errors = validator.validateSearchClaimForm(null);

      assert.deepInclude(errors, {
        claimReference: {
          text: "Enter the claim reference number",
        },
      });
    });

    it("returns an error for an empty claim reference", () => {
      const validator = new SearchClaimValidator();

      const errors = validator.validateSearchClaimForm("");

      assert.deepInclude(errors, {
        claimReference: {
          text: "Enter the claim reference number",
        },
      });
    });

    const invalidReferences = [
      "INQC-ELTH-NV7",
      "INQC-ELTH-NV700",
      "INQA-ELTH-NV70",
      "Reference",
    ];

    invalidReferences.forEach((reference) => {
      it(`returns an error for an incorrectly formatted reference: ${reference}`, () => {
        const validator = new SearchClaimValidator();

        const errors = validator.validateSearchClaimForm(reference);

        assert.deepInclude(errors, {
          claimReference: {
            text: "Enter a claim reference number in the correct format",
          },
        });
      });
    });
  });
});
