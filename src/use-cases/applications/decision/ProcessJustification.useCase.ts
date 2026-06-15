import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import type { JustificationFormErrors } from "#src/adaptors/presenter/applications/ApplicationDecision/models/form.types.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import type { DecisionSessionData } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

interface ProcessJustificationInput {
  refusalReason: string;
  justification: string;
  validationErrors: Partial<JustificationFormErrors>;
  existingSessionData?: DecisionSessionData | null;
}

interface ProcessJustificationData extends DecisionSessionData {
  refusalReason: string;
  justification: string;
}

export class ProcessJustificationUseCase {
  execute(
    input: ProcessJustificationInput,
  ): UseCaseResult<ProcessJustificationData, Partial<JustificationFormErrors>> {
    const mergedDecisionData: ProcessJustificationData = {
      ...(input.existingSessionData ?? {}),
      refusalReason: input.refusalReason,
      justification: input.justification,
    };

    if (Object.keys(input.validationErrors).length > EMPTY_ARR_LENGTH) {
      return {
        status: "VALIDATION_FAILED",
        validationErrors: input.validationErrors,
        data: mergedDecisionData,
      };
    }

    return {
      status: "SUCCESS",
      data: mergedDecisionData,
    };
  }
}
