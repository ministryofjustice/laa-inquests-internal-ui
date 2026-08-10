import type { Claim } from "#src/adaptors/models/claim.types.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";

interface BuildApplicationClaimsViewInput {
  applicationId: string;
  claimsPort: ClaimsPort;
  substantiveCertificate: number;
  accessToken?: string;
}

interface BuildApplicationClaimsViewData {
  toBeAssessedClaims: Claim[];
  assessedClaims: Claim[];
  hasClaims: boolean;
  substantiveCertificate: number;
  totalRemaining: number;
}

export class BuildApplicationClaimsViewUseCase {
  async execute(
    input: BuildApplicationClaimsViewInput,
  ): Promise<UseCaseResult<BuildApplicationClaimsViewData>> {
    if (!input.applicationId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot build application claims view without an applicationId",
      };
    }

    try {
      const [toBeAssessedClaims, assessedClaims] = await Promise.all([
        input.claimsPort.getClaims(
          input.applicationId,
          false,
          input.accessToken,
        ),
        input.claimsPort.getClaims(
          input.applicationId,
          true,
          input.accessToken,
        ),
      ]);

      const amountClaimed = assessedClaims.reduce(
        (total, claim) => total + Number(claim.totalProfitCostGross ?? 0),
        0,
      );

      return {
        status: "SUCCESS",
        data: {
          toBeAssessedClaims,
          assessedClaims,
          hasClaims: toBeAssessedClaims.length + assessedClaims.length > 0,
          substantiveCertificate: input.substantiveCertificate,
          totalRemaining: input.substantiveCertificate - amountClaimed,
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
