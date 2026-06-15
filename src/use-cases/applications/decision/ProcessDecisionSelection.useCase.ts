import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type { ApplicationDecisionFormErrors } from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface ProcessDecisionSelectionInput {
  overallDecision: string;
  validationErrors: Partial<ApplicationDecisionFormErrors>;
}

interface ProcessDecisionSelectionData {
  overallDecision: string;
}

export class ProcessDecisionSelectionUseCase {
  execute(
    input: ProcessDecisionSelectionInput,
  ): UseCaseResult<
    ProcessDecisionSelectionData,
    Partial<ApplicationDecisionFormErrors>
  > {
    if (Object.keys(input.validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors: input.validationErrors,
        data: { overallDecision: input.overallDecision },
      };
    }

    return {
      status: "SUCCESS",
      data: { overallDecision: input.overallDecision },
    };
  }
}
