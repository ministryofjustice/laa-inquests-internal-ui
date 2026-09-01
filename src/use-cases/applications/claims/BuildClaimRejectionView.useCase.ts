import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { mapClaimType } from "#src/utils/claim.js";

interface BuildClaimRejectionViewInput {
  applicationId: string;
  claimId: string;
  claimsPort: ClaimsPort;
  accessToken?: string;
}

export interface ClaimRejectionViewData {
  claimType: string;
}

export class BuildClaimRejectionViewUseCase {
  async execute(
    input: BuildClaimRejectionViewInput,
  ): Promise<UseCaseResult<ClaimRejectionViewData>> {
    if (!input.applicationId || !input.claimId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot build claim rejection view without applicationId and claimId",
      };
    }

    try {
      const claim = await input.claimsPort.getClaimById(
        input.applicationId,
        input.claimId,
        input.accessToken,
      );

      return {
        status: "SUCCESS",
        data: {
          claimType: mapClaimType(claim.claimTypeId),
        },
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
