import type { Certificate } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

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
    const certificateDetails = await this.applicationPort.getCertificateDetails(
      input.applicationId,
      input.accessToken,
    );

    // TODO: Add technical failures
    return {
      status: "SUCCESS",
      data: certificateDetails,
    };
  }
}
