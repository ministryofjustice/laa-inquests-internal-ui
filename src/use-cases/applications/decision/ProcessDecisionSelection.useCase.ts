import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type {
  ApplicationDecisionForm,
  ApplicationDecisionFormErrors,
} from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface ProcessDecisionSelectionInput {
  overallDecision: string;
  validate: (
    form: ApplicationDecisionForm,
  ) => Partial<ApplicationDecisionFormErrors>;
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
    const validationErrors = input.validate({
      "overall-decision": input.overallDecision,
    });

    if (Object.keys(validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors,
        data: { overallDecision: input.overallDecision },
      };
    }

    return {
      status: "SUCCESS",
      data: { overallDecision: input.overallDecision },
    };
  }
}
