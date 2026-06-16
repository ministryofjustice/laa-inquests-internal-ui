import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import type { DecisionSessionData } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";

interface PrepareConfirmationViewInput {
  decisionSessionData?: DecisionSessionData | null;
}

interface PrepareConfirmationViewData {
  proceeding: DecisionSessionData;
  overallDecision?: string;
  refusalReasonLabel?: string;
  justification?: string;
}

const refusalReasonLabels: Record<string, string> = {
  "not-in-scope": "Not in scope",
  "insufficient-information": "Insufficient information",
  "duplicate-case": "Duplicate case",
};

export class PrepareConfirmationViewUseCase {
  execute(
    input: PrepareConfirmationViewInput,
  ): UseCaseResult<PrepareConfirmationViewData> {
    const decisionSessionData = input.decisionSessionData ?? {};

    return {
      status: "SUCCESS",
      data: {
        proceeding: decisionSessionData,
        overallDecision: decisionSessionData.overallDecision,
        refusalReasonLabel:
          refusalReasonLabels[decisionSessionData.refusalReason ?? ""] ??
          decisionSessionData.refusalReason,
        justification: decisionSessionData.justification,
      },
    };
  }
}
