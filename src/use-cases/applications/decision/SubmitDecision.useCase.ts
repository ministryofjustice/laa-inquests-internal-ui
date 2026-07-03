import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface SubmitDecisionInput {
  applicationId: string;
  refusalReason: string;
  justification: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

export class SubmitDecisionUseCase {
  async execute(input: SubmitDecisionInput): Promise<UseCaseResult> {
    if (!input.applicationId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot submit a merits decision without applicationId and overallDecision",
      };
    }

    try {
      const refusalOptions = {
        refusalReason: input.refusalReason,
        justification: input.justification,
      };

      await input.applicationPort.submitMeritsDecision(
        input.applicationId,
        input.accessToken,
        refusalOptions,
      );

      return {
        status: "SUCCESS",
        data: undefined,
      };
    } catch (error) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        cause: error,
      };
    }
  }
}
