import type { Application } from "#src/adaptors/models/application.types.js";
import { toTitleCase } from "#src/utils/formatter.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

export interface DecisionSessionData {
  applicationId?: string;
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
