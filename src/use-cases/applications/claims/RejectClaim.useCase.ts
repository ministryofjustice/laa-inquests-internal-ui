import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

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
      logger.logWarn({
        functionName: "reject_claim_use_case",
        message: "Reject claim request is invalid",
        extraContext: {
          event: "reject_claim_invalid_input",
          laa_reference: input.applicationId,
          claim_reference: input.claimId,
          reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        },
      });
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

      logger.logInfo({
        functionName: "reject_claim_use_case",
        message: "Claim rejected",
        extraContext: {
          event: "claim_rejected",
          laa_reference: input.applicationId,
          claim_reference: input.claimId,
        },
      });

      return {
        status: "SUCCESS",
        data: undefined,
      };
    } catch (error) {
      logger.logError({
        functionName: "reject_claim_use_case",
        message: "Reject claim failed",
        err: error,
        extraContext: {
          event: "reject_claim_upstream_failed",
          laa_reference: input.applicationId,
          claim_reference: input.claimId,
          reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        },
      });
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
        cause: error,
      };
    }
  }
}
