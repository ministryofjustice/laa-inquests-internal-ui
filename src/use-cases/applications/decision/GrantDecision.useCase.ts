import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface GrantDecisionInput {
  applicationId: string;
  applicationPort: ApplicationPort;
  certificateStartDate: string;
  accessToken?: string;
}

export class GrantDecisionUseCase {
  async execute(input: GrantDecisionInput): Promise<UseCaseResult> {
    if (input.applicationId === "" || input.certificateStartDate === "") {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot grant a decision without applicationId or certificateStartDate",
      };
    }

    try {
      await input.applicationPort.submitGrantDecision(
        input.applicationId,
        input.accessToken,
        input.certificateStartDate,
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
