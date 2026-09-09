import type { Certificate } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface BuildCertificateViewInput {
  laaReference: string;
  accessToken?: string;
}

export type BuildCertificateViewResult =
  | { status: "SUCCESS"; data: Certificate }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_INPUT" };

export class BuildCertificateViewUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: BuildCertificateViewInput,
  ): Promise<BuildCertificateViewResult> {
    if (!input.laaReference) {
      return { status: "INVALID_INPUT" };
    }

    const certificate = await this.applicationPort.getCertificateDetails(
      input.laaReference,
      input.accessToken,
    );

    if (certificate === undefined) {
      return { status: "NOT_FOUND" };
    } else {
      return {
        status: "SUCCESS",
        data: certificate,
      };
    }
  }
}
