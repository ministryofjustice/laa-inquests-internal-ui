import type {
  JustificationForm,
  JustificationFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";

export class ApplicationDecisionValidator extends FormValidator {
  validateJustification(
    form: JustificationForm,
  ): Partial<JustificationFormErrors> {
    const errors: Partial<JustificationFormErrors> = {};

    const { "refusal-reason": refusalReason, justification } = form;

    if (!refusalReason) {
      errors.decisionReason = {
        text: en.pages.decision.justification.radio.validationErrors.notEmpty,
      };
    }

    if (!justification) {
      errors.decisionJustification = {
        text: en.pages.decision.justification.textarea.validationErrors
          .notEmpty,
      };
    }

    return errors;
  }
}
