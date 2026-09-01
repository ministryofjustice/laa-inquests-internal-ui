import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";
import {
  CLAIM_DECISION_STATUSES,
  DISPOSITION,
  PLACEHOLDER_VALUE,
} from "#src/infrastructure/locales/constants.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { formatCurrency } from "#src/utils/formatter.js";
import { mapClaimType } from "#src/utils/claim.js";

interface BuildClaimAssessmentViewInput {
  applicationId: string;
  claimId: string;
  applicationPort: ApplicationPort;
  claimsPort: ClaimsPort;
  accessToken?: string;
}

export interface ClaimAssessmentEvidenceRow {
  fileName: string;
  viewHref: string;
  downloadHref: string;
}

export interface ClaimCostBreakdownRow {
  fileName: string;
  downloadHref: string;
}

export interface ClaimAssessmentViewData {
  laaReference: string;
  claimId: string;
  claimStatus: string;
  overview: {
    paymentType: string;
    paymentAmount: string;
    substantiveCertificate: string;
    totalRemaining: string;
  };
  details: {
    instructedCounsel: string;
    lastWorkingDate: string;
    outcomeOfInquest: string;
    alternateFundingProgressed: string;
  };
  claimCostBreakdown: ClaimCostBreakdownRow | null;
  supportingEvidence: ClaimAssessmentEvidenceRow[];
}

export class BuildClaimAssessmentViewUseCase {
  async execute(
    input: BuildClaimAssessmentViewInput,
  ): Promise<UseCaseResult<ClaimAssessmentViewData>> {
    if (!input.applicationId || !input.claimId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot build claim assessment view without applicationId and claimId",
      };
    }

    try {
      const [application, claim] = await Promise.all([
        input.applicationPort.getApplication(
          input.applicationId,
          input.accessToken,
        ),
        input.claimsPort.getClaimById(
          input.applicationId,
          input.claimId,
          input.accessToken,
        ),
      ]);

      const substantiveCostLimitation =
        claim.substantiveCostLimitation ??
        application.proceeding.substantiveCostLimitation;

      return {
        status: "SUCCESS",
        data: {
          laaReference: String(application.laaReference),
          claimId: String(claim.claimId),
          claimStatus: mapClaimDecision(claim.claimDecision?.decision),
          overview: {
            paymentType: mapClaimType(claim.claimTypeId),
            paymentAmount: formatAmount(getPaymentAmountRaw(claim)),
            substantiveCertificate: formatAmount(substantiveCostLimitation),
            totalRemaining: formatAmount(claim.totalFundsRemainingAfterClaim),
          },
          details: {
            instructedCounsel: PLACEHOLDER_VALUE,
            lastWorkingDate: PLACEHOLDER_VALUE,
            outcomeOfInquest: PLACEHOLDER_VALUE,
            alternateFundingProgressed: PLACEHOLDER_VALUE,
          },
          claimCostBreakdown: mapClaimCostBreakdown(
            claim,
            input.applicationId,
            input.claimId,
          ),
          supportingEvidence: mapSupportingEvidence(
            claim,
            input.applicationId,
            input.claimId,
          ),
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

function mapClaimDecision(decision: string | undefined): string {
  if (!decision) {
    return PLACEHOLDER_VALUE;
  }

  return (
    (CLAIM_DECISION_STATUSES as Record<string, string>)[decision] ?? decision
  );
}

function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return PLACEHOLDER_VALUE;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return PLACEHOLDER_VALUE;
  }

  return formatCurrency(numericValue);
}

function getPaymentAmountRaw(claim: ClaimDetail): string | null {
  if (
    claim.totalProfitCostVatZero !== null &&
    claim.totalProfitCostVatZero !== undefined &&
    claim.totalProfitCostVatZero !== ""
  ) {
    return claim.totalProfitCostVatZero;
  }

  if (
    claim.totalProfitCostGross !== null &&
    claim.totalProfitCostGross !== undefined &&
    claim.totalProfitCostGross !== ""
  ) {
    return claim.totalProfitCostGross;
  }

  return null;
}

function mapSupportingEvidence(
  claim: ClaimDetail,
  applicationId: string,
  claimId: string,
): ClaimAssessmentEvidenceRow[] {
  if (claim.claimEvidence === undefined || claim.claimEvidence.length === 0) {
    return [];
  }

  const basePath = `/applications/${applicationId}/claims/${claimId}/evidence`;

  return claim.claimEvidence.map((evidence) => ({
    fileName: evidence.fileName,
    viewHref: `${basePath}/${evidence.claimEvidenceId}?disposition=${DISPOSITION.INLINE}`,
    downloadHref: `${basePath}/${evidence.claimEvidenceId}?disposition=${DISPOSITION.ATTACHMENT}`,
  }));
}

function mapClaimCostBreakdown(
  claim: ClaimDetail,
  applicationId: string,
  claimId: string,
): ClaimCostBreakdownRow | null {
  const { claimCostTemplateFile: costTemplateFile } = claim;

  if (!costTemplateFile) {
    return null;
  }

  const basePath = `/applications/${applicationId}/claims/${claimId}/evidence`;

  return {
    fileName: costTemplateFile.claimCostTemplateFileName,
    downloadHref: `${basePath}/${costTemplateFile.claimCostTemplateFileId}?disposition=${DISPOSITION.ATTACHMENT}`,
  };
}
