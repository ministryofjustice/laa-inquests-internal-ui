import type { Application } from "#src/adaptors/models/application.types.js";
import { toTitleCase } from "#src/utils/formatter.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

export interface DecisionSessionData {
  certificateType?: string;
  meritsDecision?: string;
  overallDecision?: string;
  refusalReason?: string;
  justification?: string;
}

interface PrepareDecisionFormInput {
  application: Pick<Application, "proceedings" | "overallDecision">;
  sessionDecision?: DecisionSessionData | null;
}

interface PrepareDecisionFormData {
  proceeding: {
    certificateType: string;
    meritsDecision: string;
  };
  selectedOverallDecision?: string;
}

export class PrepareDecisionFormUseCase {
  execute(
    input: PrepareDecisionFormInput,
  ): UseCaseResult<PrepareDecisionFormData> {
    if (!input.application.proceedings.length) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Application has no proceedings",
      };
    }

    // Only the first proceeding is shown in this form today.
    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- first item extraction is intentional
    const [firstProceeding] = input.application.proceedings;
    const proceeding = {
      certificateType: toTitleCase(firstProceeding.certificateType),
      meritsDecision: toTitleCase(
        input.application.overallDecision ?? "PENDING",
      ),
    };

    return {
      status: "SUCCESS",
      data: {
        proceeding,
        selectedOverallDecision: input.sessionDecision?.overallDecision,
      },
    };
  }
}
