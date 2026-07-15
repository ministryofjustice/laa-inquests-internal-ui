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

  // TODO: Return BuildCertificateViewData instead of Certificate
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
      const certificateDetails =
        await this.applicationPort.getCertificateDetails(
          input.applicationId,
          input.accessToken,
        );

      return {
        status: "SUCCESS",
        data: certificateDetails,
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
