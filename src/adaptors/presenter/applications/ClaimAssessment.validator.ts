import type {
  AssessClaimForm,
  AssessClaimFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import {
  CLAIM_DECISION_STATUSES,
  REJECTION_REASON_MAX_CHARACTER_LENGTH,
} from "#src/infrastructure/locales/constants.js";

const REJECT_DECISION: string = CLAIM_DECISION_STATUSES.REJECT;

export class ClaimAssessmentValidator extends FormValidator {
  validateAssessClaimForm(
    form: AssessClaimForm,
  ): Partial<AssessClaimFormErrors> {
    const errors: Partial<AssessClaimFormErrors> = {};

    const { assessClaim, "rejection-reason": rejectionReason } = form;

    if (!assessClaim) {
      errors.assessClaim = {
        text: en.pages.claimAssessment.radio.validationError,
      };
      return errors;
    }

    if (assessClaim === REJECT_DECISION) {
      if (!rejectionReason.trim()) {
        errors.rejectionReason = {
          text: en.pages.claimAssessment.radio.validationErrors.reasonNotEmpty,
        };
      } else if (
        this.exceedsMaxLength(
          rejectionReason,
          REJECTION_REASON_MAX_CHARACTER_LENGTH,
        )
      ) {
        errors.rejectionReason = {
          text: en.pages.claimAssessment.radio.validationErrors.reasonTooLong,
        };
      }
    }

    return errors;
  }
}
