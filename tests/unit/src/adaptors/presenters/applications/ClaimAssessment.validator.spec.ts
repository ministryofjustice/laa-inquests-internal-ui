import { assert } from "chai";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { ClaimAssessmentValidator } from "#src/adaptors/presenter/applications/ClaimAssessment.validator.js";
import type { AssessClaimForm } from "#src/adaptors/presenter/models/form.types.js";

describe("ClaimAssessmentValidator", () => {
  const validator = new ClaimAssessmentValidator();
  const radioLocale = en.pages.claimAssessment.radio;

  describe("validateAssessClaimForm", () => {
    it("adds an assessClaim error when no claim decision is selected", () => {
      const form: AssessClaimForm = {
        assessClaim: "",
        "rejection-reason": "",
      };

      const errors = validator.validateAssessClaimForm(form);

      assert.deepInclude(errors, {
        assessClaim: { text: radioLocale.validationError },
      });
    });

    it("does not validate the rejection reason when Pay in full is selected", () => {
      const form: AssessClaimForm = {
        assessClaim: "Pay in full",
        "rejection-reason": "",
      };

      const errors = validator.validateAssessClaimForm(form);

      assert.notProperty(errors, "rejectionReason");
    });

    it("adds a reasonNotEmpty error when Reject is selected without a reason", () => {
      const form: AssessClaimForm = {
        assessClaim: "Reject",
        "rejection-reason": "",
      };

      const errors = validator.validateAssessClaimForm(form);

      assert.deepInclude(errors, {
        rejectionReason: { text: radioLocale.validationErrors.reasonNotEmpty },
      });
    });

    it("adds a reasonNotEmpty error when the reason is only whitespace", () => {
      const form: AssessClaimForm = {
        assessClaim: "Reject",
        "rejection-reason": "   ",
      };

      const errors = validator.validateAssessClaimForm(form);

      assert.deepInclude(errors, {
        rejectionReason: { text: radioLocale.validationErrors.reasonNotEmpty },
      });
    });

    it("adds a reasonTooLong error when the reason exceeds 500 characters", () => {
      const form: AssessClaimForm = {
        assessClaim: "Reject",
        "rejection-reason": "a".repeat(501),
      };

      const errors = validator.validateAssessClaimForm(form);

      assert.deepInclude(errors, {
        rejectionReason: { text: radioLocale.validationErrors.reasonTooLong },
      });
    });

    it("does not add an error when Reject is selected with a valid reason", () => {
      const form: AssessClaimForm = {
        assessClaim: "Reject",
        "rejection-reason": "Not enough supporting evidence provided",
      };

      const errors = validator.validateAssessClaimForm(form);

      assert.deepEqual(errors, {});
    });
  });
});
