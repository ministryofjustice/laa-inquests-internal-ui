import type { ApplicationSummary } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

interface BuildApplicationsListViewInput {
  applicationPort: ApplicationPort;
  accessToken?: string;
}

interface BuildApplicationsListViewData {
  applications: ApplicationSummary[];
}

export class BuildApplicationsListViewUseCase {
  async execute(
    input: BuildApplicationsListViewInput,
  ): Promise<UseCaseResult<BuildApplicationsListViewData>> {
    try {
      const applications = await input.applicationPort.getAllApplications(
        input.accessToken,
      );

      return {
        status: "SUCCESS",
        data: { applications },
      };
    } catch (error) {
      logger.logError({
        functionName: "build_applications_list_view_use_case",
        message: "Failed to build applications list view",
        err: error,
        extraContext: {
          event: "applications_list_retrieval_failed",
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
