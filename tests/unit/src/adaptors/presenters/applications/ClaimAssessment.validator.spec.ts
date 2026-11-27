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

    const validateRejectionReason = (rejectionReason: string) =>
      validator.validateAssessClaimForm({
        assessClaim: "Reject",
        "rejection-reason": rejectionReason,
      });

    [
      ["a less-than sign", "cost < estimate"],
      ["a greater-than sign", "cost > estimate"],
      ["a script tag", "<script>alert(1)</script>"],
      ["a control character", "bell\u0007"],
      ["a null byte", "null\u0000byte"],
      ["a zero-width character", "zero\u200bwidth"],
      ["a right-to-left override", "\u202etxt.exe"],
    ].forEach(([reason, value]) => {
      it(`adds a reasonInvalidCharacters error when the reason contains ${reason}`, () => {
        assert.deepEqual(validateRejectionReason(value), {
          rejectionReason: {
            text: radioLocale.validationErrors.reasonInvalidCharacters,
          },
        });
      });
    });

    it("reports too long before unsafe characters", () => {
      assert.deepEqual(validateRejectionReason(`<${"a".repeat(500)}`), {
        rejectionReason: { text: radioLocale.validationErrors.reasonTooLong },
      });
    });

    [
      "Not enough supporting evidence provided",
      "Line one\nline two\r\nline three",
      "Column\tone",
      'The provider\'s "claim"; see s.1 (a) & (b): =+@ 100% £5 #2',
      "Zoë 李明 O\u2019Brien",
      "a".repeat(500),
    ].forEach((value) => {
      it(`accepts the reason ${JSON.stringify(value.slice(0, 40))}`, () => {
        assert.deepEqual(validateRejectionReason(value), {});
      });
    });

    it("does not check the reason for unsafe characters when Pay in full is selected", () => {
      const errors = validator.validateAssessClaimForm({
        assessClaim: "Pay in full",
        "rejection-reason": "<script>",
      });

      assert.deepEqual(errors, {});
    });
  });
});
