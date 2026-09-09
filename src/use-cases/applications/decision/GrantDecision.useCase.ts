import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface GrantDecisionInput {
  laaReference: string;
  certificateStartDate: string;
  accessToken?: string;
}

export type GrantDecisionResult =
  | { status: "SUCCESS"; data: undefined }
  | { status: "INVALID_INPUT"; message: string };

export class GrantDecisionUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(input: GrantDecisionInput): Promise<GrantDecisionResult> {
    if (input.laaReference === "" || input.certificateStartDate === "") {
      return {
        status: "INVALID_INPUT",
        message:
          "Cannot grant a decision without laaReference or certificateStartDate",
      };
    }

    await this.applicationPort.submitGrantDecision(
      input.laaReference,
      input.accessToken,
      input.certificateStartDate,
    );
    return { status: "SUCCESS", data: undefined };
  }
}
