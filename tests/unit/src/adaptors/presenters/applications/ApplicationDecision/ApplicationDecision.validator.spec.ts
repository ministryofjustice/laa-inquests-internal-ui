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

    const justificationErrors =
      en.pages.decision.justification.textarea.validationErrors;
    const validateJustificationText = (justification: string) =>
      validator.validateJustification({
        "refusal-reason": "not-in-scope",
        justification,
      });

    it("adds the invalid characters message for a lone surrogate", () => {
      assert.deepEqual(validateJustificationText("abc\uD800"), {
        decisionJustification: { text: justificationErrors.invalidCharacters },
      });
    });

    ["   ", "\t\n\r ", "\n\n"].forEach((value) => {
      it(`adds empty justification error when the text is only whitespace (${JSON.stringify(value)})`, () => {
        assert.deepEqual(validateJustificationText(value), {
          decisionJustification: { text: justificationErrors.notEmpty },
        });
      });
    });

    [
      ["a less-than sign", "a < b"],
      ["a greater-than sign", "a > b"],
      ["a script tag", "<script>alert(1)</script>"],
      ["a control character", "bell\u0007"],
      ["a null byte", "null\u0000byte"],
      ["a zero-width character", "zero\u200bwidth"],
      ["a right-to-left override", "\u202etxt.exe"],
    ].forEach(([reason, value]) => {
      it(`adds the unsafe characters error when justification contains ${reason}`, () => {
        assert.deepEqual(validateJustificationText(value), {
          decisionJustification: { text: justificationErrors.unsafeCharacters },
        });
      });
    });

    it("reports too long before unsafe characters", () => {
      assert.deepEqual(validateJustificationText(`<${"a".repeat(1500)}`), {
        decisionJustification: { text: justificationErrors.tooLong },
      });
    });

    [
      "The application is outside the scope of the scheme.",
      "Line one\nline two\r\nline three",
      "Column\tone",
      'The client\'s "claim"; see s.1 (a) & (b): =+@ 100% £5 #2',
      "Zoë 李明 O\u2019Brien",
      "a".repeat(1500),
    ].forEach((value) => {
      it(`accepts the justification ${JSON.stringify(value.slice(0, 40))}`, () => {
        assert.deepEqual(validateJustificationText(value), {});
      });
    });

    it("reports both a missing reason and unsafe characters", () => {
      const errors = validator.validateJustification({
        "refusal-reason": "",
        justification: "<b>x</b>",
      });

      assert.deepEqual(errors, {
        decisionReason: {
          text: en.pages.decision.justification.radio.validationErrors.notEmpty,
        },
        decisionJustification: { text: justificationErrors.unsafeCharacters },
      });
    });
  });

  describe("validateCertificateStartDate", () => {
    const startDateErrors =
      en.pages.decision.certificateStartDate.validationErrors;

    it("adds a notEmpty error when all date fields are empty", () => {
      const errors = validator.validateCertificateStartDate({
        "start-date-option": "another-date",
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
        "start-date-option": "another-date",
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
        "start-date-option": "another-date",
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
        "start-date-option": "another-date",
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
        "start-date-option": "another-date",
        "start-date-day": "1",
        "start-date-month": "1",
        "start-date-year": "2020",
      });

      assert.deepEqual(errors, {});
    });
  });
});
