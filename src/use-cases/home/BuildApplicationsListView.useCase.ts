import type { ApplicationSummary } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface BuildApplicationsListViewInput {
  applicationPort: ApplicationPort;
}

interface BuildApplicationsListViewData {
  applications: ApplicationSummary[];
}

export class BuildApplicationsListViewUseCase {
  async execute(
    input: BuildApplicationsListViewInput,
  ): Promise<UseCaseResult<BuildApplicationsListViewData>> {
    try {
      const applications = await input.applicationPort.getAllApplications();

      return {
        status: "SUCCESS",
        data: { applications },
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
