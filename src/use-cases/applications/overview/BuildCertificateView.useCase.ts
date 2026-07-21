import type { Certificate } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface BuildCertificateViewInput {
  applicationId: string;
  accessToken?: string;
}

export class BuildCertificateViewUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: BuildCertificateViewInput,
  ): Promise<UseCaseResult<Certificate>> {
    if (!input.applicationId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot build certificate view without an applicationId",
      };
    }

    try {
      const certificateResult =
        await this.applicationPort.getCertificateDetails(
          input.applicationId,
          input.accessToken,
        );

      if (certificateResult.status === "FAILURE") {
        return {
          status: "TECHNICAL_FAILURE",
          reason: certificateResult.reason,
          message: certificateResult.message,
          cause: certificateResult.cause,
        };
      }

      return {
        status: "SUCCESS",
        data: certificateResult.data,
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
