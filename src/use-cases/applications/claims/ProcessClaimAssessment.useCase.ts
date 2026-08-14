import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  AssessClaimForm,
  AssessClaimFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface ProcessClaimAssessmentInput {
  assessClaim: string;
  rejectionReason: string;
  validate: (form: AssessClaimForm) => Partial<AssessClaimFormErrors>;
}

interface ProcessClaimAssessmentData {
  assessClaim: string;
  rejectionReason: string;
}

export class ProcessClaimAssessmentUseCase {
  execute(
    input: ProcessClaimAssessmentInput,
  ): UseCaseResult<ProcessClaimAssessmentData, Partial<AssessClaimFormErrors>> {
    const validationErrors = input.validate({
      assessClaim: input.assessClaim,
      "rejection-reason": input.rejectionReason,
    });

    const data: ProcessClaimAssessmentData = {
      assessClaim: input.assessClaim,
      rejectionReason: input.rejectionReason,
    };

    if (Object.keys(validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors,
        data,
      };
    }

    return {
      status: "SUCCESS",
      data,
    };
  }
}
