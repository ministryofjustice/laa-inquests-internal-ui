import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { getClaimCost } from "#src/utils/claim.js";
import { PAYABLE_CLAIM_STATUSES } from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

interface BuildApplicationClaimsViewInput {
  applicationId: string;
  claimsPort: ClaimsPort;
  substantiveCertificate: number;
  accessToken?: string;
}

interface BuildApplicationClaimsViewData {
  toBeAssessedClaims: ClaimSummary[];
  assessedClaims: ClaimSummary[];
  hasClaims: boolean;
  substantiveCertificate: number;
  totalRemaining: number;
}

export class BuildApplicationClaimsViewUseCase {
  async execute(
    input: BuildApplicationClaimsViewInput,
  ): Promise<UseCaseResult<BuildApplicationClaimsViewData>> {
    if (!input.applicationId) {
      logger.logWarn({
        functionName: "build_application_claims_view_use_case",
        message: "Application claims view request is invalid",
        extraContext: {
          event: "application_claims_view_invalid_input",
          laa_reference: input.applicationId,
        },
      });
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

      sortByDateDescending(toBeAssessedClaims);
      sortByDateDescending(assessedClaims);

      const amountClaimed = assessedClaims
        .filter((claim) =>
          PAYABLE_CLAIM_STATUSES.includes(
            claim.statusId ?? claim.claimDecisionStatus ?? "",
          ),
        )
        .reduce((total, claim) => total + getClaimCost(claim), 0);

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
      logger.logError({
        functionName: "build_application_claims_view_use_case",
        message: "Failed to build application claims view",
        err: error,
        extraContext: {
          event: "application_claims_view_retrieval_failed",
          laa_reference: input.applicationId,
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

function sortByDateDescending(claims: ClaimSummary[]): void {
  claims.sort(
    (first, second) =>
      new Date(second.submissionDate).getTime() -
      new Date(first.submissionDate).getTime(),
  );
}
