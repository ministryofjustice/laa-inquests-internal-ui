import type { HistoryEvent } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface BuildApplicationHistoryViewInput {
  applicationId: string;
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
    if (!input.applicationId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot build application history view without an applicationId",
      };
    }

    try {
      const history = await input.applicationPort.getApplicationHistory(
        input.applicationId,
        input.accessToken,
      );

      return {
        status: "SUCCESS",
        data: {
          history,
        },
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
