import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

interface GrantDecisionInput {
  applicationId: string;
  applicationPort: ApplicationPort;
  certificateStartDate: string;
  accessToken?: string;
}

export class GrantDecisionUseCase {
  async execute(input: GrantDecisionInput): Promise<UseCaseResult> {
    if (input.applicationId === "" || input.certificateStartDate === "") {
      // COPILOT TODO: Should be logging here
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
      logger.logInfo({
        functionName: "grant_decision_use_case",
        message: "Decision granted",
        extraContext: {
          event: "application_decision_granted",
          laa_reference: input.applicationId,
          certificate_start_date: input.certificateStartDate,
        },
      });
      return {
        status: "SUCCESS",
        data: undefined,
      };
    } catch (error) {
      // COPILOT TODO: Should be logging here
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        cause: error,
      };
    }
  }
}
