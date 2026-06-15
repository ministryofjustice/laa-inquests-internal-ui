import type { Application } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface BuildApplicationOverviewViewInput {
  applicationId: string;
  applicationPort: ApplicationPort;
}

interface BuildApplicationOverviewViewData {
  application: Application;
}

export class BuildApplicationOverviewViewUseCase {
  async execute(
    input: BuildApplicationOverviewViewInput,
  ): Promise<UseCaseResult<BuildApplicationOverviewViewData>> {
    if (!input.applicationId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot build application overview without an applicationId",
      };
    }

    try {
      const application = await input.applicationPort.getApplication(
        input.applicationId,
      );

      return {
        status: "SUCCESS",
        data: { application },
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
