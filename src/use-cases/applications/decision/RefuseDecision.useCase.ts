import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface RefuseDecisionInput {
  applicationId: string;
  refusalReason: string;
  justification: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

export class RefuseDecisionUseCase {
  async execute(input: RefuseDecisionInput): Promise<UseCaseResult> {
    if (!input.applicationId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot refuse a merits decision without applicationId",
      };
    }

    try {
      await input.applicationPort.submitRefuseDecision(
        input.applicationId,
        input.accessToken,
        input.refusalReason,
        input.justification,
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
