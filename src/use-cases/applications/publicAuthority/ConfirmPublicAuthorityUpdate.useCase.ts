import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface ConfirmPublicAuthorityUpdateInput {
  laaReference: string;
  selectedPublicAuthorityIds: string[];
  accessToken?: string;
}

export type ConfirmPublicAuthorityUpdateResult =
  | { status: "SUCCESS"; data: undefined }
  | { status: "INVALID_INPUT"; message: string };

export class ConfirmPublicAuthorityUpdateUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: ConfirmPublicAuthorityUpdateInput,
  ): Promise<ConfirmPublicAuthorityUpdateResult> {
    if (
      input.laaReference === "" ||
      input.selectedPublicAuthorityIds.length === 0
    ) {
      return {
        status: "INVALID_INPUT",
        message:
          "Cannot update public authorities without laaReference or selected public authorities",
      };
    }

    await this.applicationPort.updateApplicationPublicBodies(
      input.laaReference,
      input.accessToken,
      input.selectedPublicAuthorityIds,
    );
    return { status: "SUCCESS", data: undefined };
  }
}
