import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface ConfirmPublicAuthorityUpdateInput {
  laaReference: string;
  applicationPort: ApplicationPort;
  selectedPublicAuthorityIds: string[];
  accessToken?: string;
}

export class ConfirmPublicAuthorityUpdateUseCase {
  async execute(
    input: ConfirmPublicAuthorityUpdateInput,
  ): Promise<UseCaseResult> {
    if (
      input.laaReference === "" ||
      input.selectedPublicAuthorityIds.length === 0
    ) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot update public authorities without laaReference or selected public authorities",
      };
    }

    try {
      await input.applicationPort.updateApplicationPublicBodies(
        input.laaReference,
        input.accessToken,
        input.selectedPublicAuthorityIds,
      );
      return {
        status: "SUCCESS",
        data: undefined,
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
