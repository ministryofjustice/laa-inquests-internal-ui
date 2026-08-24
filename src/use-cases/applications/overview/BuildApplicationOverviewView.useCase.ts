import type { Application } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

interface BuildApplicationOverviewViewInput {
  applicationId: string;
  applicationPort: ApplicationPort;
  accessToken?: string;
}

interface BuildApplicationOverviewViewData {
  application: Application;
}

export class BuildApplicationOverviewViewUseCase {
  async execute(
    input: BuildApplicationOverviewViewInput,
  ): Promise<UseCaseResult<BuildApplicationOverviewViewData>> {
    if (!input.applicationId) {
      logger.logWarn({
        functionName: "build_application_overview_view_use_case",
        message: "Application overview request is invalid",
        extraContext: {
          event: "application_overview_invalid_input",
          laa_reference: input.applicationId,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot build application overview without an applicationId",
      };
    }

    try {
      const application = await input.applicationPort.getApplication(
        input.applicationId,
        input.accessToken,
      );

      return {
        status: "SUCCESS",
        data: { application },
      };
    } catch (error) {
      logger.logError({
        functionName: "build_application_overview_view_use_case",
        message: "Failed to build application overview view",
        err: error,
        extraContext: {
          event: "application_overview_retrieval_failed",
          laa_reference: input.applicationId,
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
