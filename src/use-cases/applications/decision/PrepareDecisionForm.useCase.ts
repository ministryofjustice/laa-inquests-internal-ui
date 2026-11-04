import type { Application } from "#src/adaptors/models/application.types.js";
import { toTitleCase } from "#src/utils/formatter.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";

export interface DecisionSessionData {
  laaReference?: string;
  certificateType?: string;
  meritsDecision?: string;
  overallDecision?: string;
  returnToCheckYourAnswers?: string;
  refusalReason?: string;
  justification?: string;
  certificateStartDateOption?: string;
  certificateStartDateDay?: string;
  certificateStartDateMonth?: string;
  certificateStartDateYear?: string;
}

interface PrepareDecisionFormInput {
  application: Pick<Application, "proceeding" | "overallDecision">;
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
    const proceeding = {
      certificateType: toTitleCase(
        input.application.proceeding.certificateType,
      ),
      meritsDecision: toTitleCase(input.application.overallDecision ?? ""),
    };

    if (input.application.overallDecision === "GRANTED") {
      //TODO: Create a constant or utility to determine protected final states
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        cause: "Application is in a protected final state",
      };
    }

    return {
      status: "SUCCESS",
      data: {
        proceeding,
        selectedOverallDecision: input.sessionDecision?.overallDecision,
      },
    };
  }
}
