import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";
import type { DecisionSessionData } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";
import { formatDate } from "#src/utils/dateFormatter.js";

interface PrepareConfirmationViewInput {
  decisionSessionData?: DecisionSessionData | null;
}

interface PrepareConfirmationViewData {
  proceeding: DecisionSessionData;
  overallDecision?: string;
  refusalReasonLabel?: string;
  justification?: string;
  certificateStartDate?: string;
}

// TODO: Again for dates, make this generic somewhere and extract
const ISO_PAD_LENGTH = 2;

function toIsoDateFromParts(
  day?: string,
  month?: string,
  year?: string,
): string | undefined {
  if (!day || !month || !year) {
    return undefined;
  }

  const parsedDay = Number.parseInt(day, 10);
  const parsedMonth = Number.parseInt(month, 10);
  if (Number.isNaN(parsedDay) || Number.isNaN(parsedMonth)) {
    return undefined;
  }

  return `${year}-${String(parsedMonth).padStart(ISO_PAD_LENGTH, "0")}-${String(
    parsedDay,
  ).padStart(ISO_PAD_LENGTH, "0")}`;
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
    const certificateStartDateIso = toIsoDateFromParts(
      decisionSessionData.certificateStartDateDay,
      decisionSessionData.certificateStartDateMonth,
      decisionSessionData.certificateStartDateYear,
    );

    return {
      status: "SUCCESS",
      data: {
        proceeding: decisionSessionData,
        overallDecision: decisionSessionData.overallDecision,
        refusalReasonLabel:
          refusalReasonLabels[decisionSessionData.refusalReason ?? ""] ??
          decisionSessionData.refusalReason,
        justification: decisionSessionData.justification,
        certificateStartDate: certificateStartDateIso
          ? formatDate(certificateStartDateIso)
          : undefined,
      },
    };
  }
}
