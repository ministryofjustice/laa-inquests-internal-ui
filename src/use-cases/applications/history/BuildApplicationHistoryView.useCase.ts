import type { HistoryEvent } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/logging/logger.js";

interface BuildApplicationHistoryViewInput {
  laaReference: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

interface BuildApplicationHistoryViewData {
  history: HistoryEvent[];
}

export class BuildApplicationHistoryViewUseCase {
  async execute(
    input: BuildApplicationHistoryViewInput,
  ): Promise<UseCaseResult<BuildApplicationHistoryViewData>> {
    if (!input.laaReference) {
      logger.logWarn({
        functionName: "build_application_history_view_use_case",
        message: "Application history view request is invalid",
        extraContext: {
          event: "application_history_view_invalid_input",
          laa_reference: input.laaReference,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot build application history view without an laaReference",
      };
    }

    try {
      const history = await input.applicationPort.getApplicationHistory(
        input.laaReference,
        input.accessToken,
      );

      return {
        status: "SUCCESS",
        data: {
          history,
        },
      };
    } catch (error) {
      logger.logError({
        functionName: "build_application_history_view_use_case",
        message: "Failed to build application history view",
        err: error,
        extraContext: {
          event: "application_history_retrieval_failed",
          laa_reference: input.laaReference,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        cause: error,
      };
    }
  }
}
