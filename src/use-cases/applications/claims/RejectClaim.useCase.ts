import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface RejectClaimInput {
  applicationId: string;
  claimId: string;
  justification: string;
  claimsPort: ClaimsPort;
  accessToken?: string;
}

export class RejectClaimUseCase {
  async execute(input: RejectClaimInput): Promise<UseCaseResult> {
    if (!input.applicationId || !input.claimId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message: "Cannot reject a claim without applicationId and claimId",
      };
    }

    try {
      await input.claimsPort.rejectClaim(
        input.applicationId,
        input.claimId,
        input.justification,
        input.accessToken,
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
