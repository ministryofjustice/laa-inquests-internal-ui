import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

interface RefuseDecisionInput {
  laaReference: string;
  refusalReason: string;
  justification: string;
  accessToken?: string;
}

export type RefuseDecisionResult =
  | { status: "SUCCESS"; data: undefined }
  | { status: "INVALID_INPUT"; message: string };

export class RefuseDecisionUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(input: RefuseDecisionInput): Promise<RefuseDecisionResult> {
    if (!input.laaReference) {
      return {
        status: "INVALID_INPUT",
        message: "Cannot refuse a merits decision without laaReference",
      };
    }

    await this.applicationPort.submitRefuseDecision(
      input.laaReference,
      input.accessToken,
      input.refusalReason,
      input.justification,
    );
    return { status: "SUCCESS", data: undefined };
  }
}
