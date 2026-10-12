import type { Application } from "#src/adaptors/models/application.types.js";
import { SUBMITTED_DECISION } from "#src/infrastructure/locales/constants.js";
import { toTitleCase } from "#src/utils/formatter.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

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
      meritsDecision:
        input.application.overallDecision === null
          ? ""
          : toTitleCase(
              input.application.overallDecision ?? SUBMITTED_DECISION,
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
