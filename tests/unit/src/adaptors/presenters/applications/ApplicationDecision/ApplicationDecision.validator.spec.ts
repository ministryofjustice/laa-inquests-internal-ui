import { assert } from "chai";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { ApplicationDecisionValidator } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.validator.js";
import { JustificationForm } from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";

describe("ApplicationDecisionValidator", () => {
  const validator = new ApplicationDecisionValidator();

  describe("validateJustification", () => {
    it("add empty decision reason error when no reason selected", () => {
      const form: JustificationForm = {
        "refusal-reason": "",
        justification: "Some justification",
      };

      const errors = validator.validateJustification(form);
      assert.deepInclude(errors, {
        decisionReason: {
          text: en.pages.decision.justification.radio.validationErrors.notEmpty,
        },
      });
    });

    it("adds empty justification error when textarea is empty", () => {
      const form: JustificationForm = {
        "refusal-reason": "not-in-scope",
        justification: "",
      };

      const errors = validator.validateJustification(form);
      assert.deepInclude(errors, {
        decisionJustification: {
          text: en.pages.decision.justification.textarea.validationErrors
            .notEmpty,
        },
      });
    });

    it("adds too long error when justification exceeds 1500 characters", () => {
      const form: JustificationForm = {
        "refusal-reason": "not-in-scope",
        justification: "a".repeat(1501),
      };

      const errors = validator.validateJustification(form);
      assert.deepInclude(errors, {
        decisionJustification: {
          text: en.pages.decision.justification.textarea.validationErrors
            .tooLong,
        },
      });
    });
  });
});
