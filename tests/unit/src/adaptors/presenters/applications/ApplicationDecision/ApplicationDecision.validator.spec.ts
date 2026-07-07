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

    it("adds a decisionJustification error by calling hasInvalidUnicodeCharacters when justification contains non-unicode characters", () => {
      const form: JustificationForm = {
        "refusal-reason": "not-in-scope",
        justification: "\uD800",
      };

      const errors = validator.validateJustification(form);
      assert.exists(errors.decisionJustification);
    });
  });

  describe("validateCertificateStartDate", () => {
    const startDateErrors =
      en.pages.decision.certificateStartDate.validationErrors;

    it("adds a notEmpty error when all date fields are empty", () => {
      const errors = validator.validateCertificateStartDate({
        "start-date-day": "",
        "start-date-month": "",
        "start-date-year": "",
      });

      assert.deepInclude(errors, {
        certificateStartDate: { text: startDateErrors.notEmpty },
      });
    });

    it("adds an invalidDate error when the date is not real", () => {
      const errors = validator.validateCertificateStartDate({
        "start-date-day": "31",
        "start-date-month": "2",
        "start-date-year": "2020",
      });

      assert.deepInclude(errors, {
        certificateStartDate: { text: startDateErrors.invalidDate },
      });
    });

    it("adds an invalidDate error when a field is out of range", () => {
      const errors = validator.validateCertificateStartDate({
        "start-date-day": "10",
        "start-date-month": "13",
        "start-date-year": "2020",
      });

      assert.deepInclude(errors, {
        certificateStartDate: { text: startDateErrors.invalidDate },
      });
    });

    it("adds a future error when the date is in the future", () => {
      const nextYear = new Date().getFullYear() + 1;
      const errors = validator.validateCertificateStartDate({
        "start-date-day": "1",
        "start-date-month": "1",
        "start-date-year": String(nextYear),
      });

      assert.deepInclude(errors, {
        certificateStartDate: { text: startDateErrors.future },
      });
    });

    it("returns no errors for a valid past date", () => {
      const errors = validator.validateCertificateStartDate({
        "start-date-day": "1",
        "start-date-month": "1",
        "start-date-year": "2020",
      });

      assert.deepEqual(errors, {});
    });
  });
});
