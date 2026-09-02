import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";
import {
  CLAIM_DECISION_STATUSES,
  CLAIM_TYPES,
  DISPOSITION,
  INQUEST_OUTCOMES,
  PLACEHOLDER_VALUE,
} from "#src/infrastructure/locales/constants.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { formatDate } from "#src/utils/dateFormatter.js";
import { formatCurrency } from "#src/utils/formatter.js";

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

export interface ClaimAssessmentFinalOrNilBillDetails {
  claimCostTemplateFile?: ClaimAssessmentEvidenceRow;
  supportingEvidence: ClaimAssessmentEvidenceRow[];
  counsel?: {
    numberInstructed: string;
    hasBeenPaid: string;
    lastWorkingDate: string;
  };
  inquestDetails?: {
    outcome: string;
    alternativeFundingPostInquest: string;
  };
  alternativeFundingDetails?: {
    recoveryCostsMade: string;
    previousPreCertificateCosts: string;
    payingParty: string;
  };
  financialRecoveryCosts?: {
    costs: string;
    damages: string;
    interest: string;
    previousPreCertificateCosts: string;
  };
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
  supportingEvidence: ClaimAssessmentEvidenceRow[];
  finalOrNilBillDetails?: ClaimAssessmentFinalOrNilBillDetails;
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
            instructedCounsel: formatCounselCount(
              claim.numberOfCounselInstructed,
            ),
            lastWorkingDate: formatDate(claim.submissionDate),
            outcomeOfInquest: formatInquestOutcomes(claim.inquestOutcomes),
            alternateFundingProgressed: formatBoolean(
              claim.hasAlternativeFunding,
            ),
          },
          supportingEvidence: mapSupportingEvidence(
            claim,
            input.applicationId,
            input.claimId,
          ),
          ...(isFinalOrNilBill(claim.claimTypeId)
            ? {
                finalOrNilBillDetails: mapFinalOrNilBillDetails(
                  claim,
                  input.applicationId,
                  input.claimId,
                ),
              }
            : {}),
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

function mapClaimType(claimTypeId: string): string {
  return (CLAIM_TYPES as Record<string, string>)[claimTypeId] ?? claimTypeId;
}

function isFinalOrNilBill(claimTypeId: string): boolean {
  return claimTypeId === "FINAL_BILL" || claimTypeId === "NIL_BILL";
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

function formatCounselCount(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return PLACEHOLDER_VALUE;
  }

  return String(value);
}

function formatInquestOutcomes(outcomes: string[] | null | undefined): string {
  if (outcomes === null || outcomes === undefined || outcomes.length === 0) {
    return PLACEHOLDER_VALUE;
  }

  return outcomes
    .map(
      (outcome) =>
        (INQUEST_OUTCOMES as Record<string, string>)[outcome] ?? outcome,
    )
    .join(", ");
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return PLACEHOLDER_VALUE;
  }

  if (value) {
    return "Yes";
  }

  return "No";
}

function hasValue(
  value: string | number | boolean | null | undefined,
): boolean {
  return value !== null && value !== undefined && value !== "";
}

// eslint-disable-next-line complexity -- This maps the conditional final and nil bill view sections.
function mapFinalOrNilBillDetails(
  claim: ClaimDetail,
  applicationId: string,
  claimId: string,
): ClaimAssessmentFinalOrNilBillDetails {
  const supportingEvidence = mapSupportingEvidence(
    claim,
    applicationId,
    claimId,
  );
  const claimCostTemplateFile = claim.claimCostTemplateFile
    ? mapEvidenceRow(
        claim.claimCostTemplateFile.claimCostTemplateFileName,
        claim.claimCostTemplateFile.claimCostTemplateFileId,
        applicationId,
        claimId,
      )
    : undefined;

  return {
    claimCostTemplateFile,
    supportingEvidence,
    counsel:
      hasValue(claim.numberOfCounselInstructed) ||
      hasValue(claim.hasCounselBeenPaid)
        ? {
            numberInstructed: formatCounselCount(
              claim.numberOfCounselInstructed,
            ),
            hasBeenPaid: formatBoolean(claim.hasCounselBeenPaid),
            lastWorkingDate: formatDate(claim.submissionDate),
          }
        : undefined,
    inquestDetails:
      hasValue(claim.hasAlternativeFunding) ||
      (claim.inquestOutcomes !== null &&
        claim.inquestOutcomes !== undefined &&
        claim.inquestOutcomes.length > 0)
        ? {
            outcome: formatInquestOutcomes(claim.inquestOutcomes),
            alternativeFundingPostInquest: formatBoolean(
              claim.hasAlternativeFunding,
            ),
          }
        : undefined,
    alternativeFundingDetails:
      hasValue(claim.hasRecoveryCostsAwarded) ||
      hasValue(claim.financialRecoveryPreviousPreCertificateCosts) ||
      hasValue(claim.payingParty)
        ? {
            recoveryCostsMade: formatBoolean(claim.hasRecoveryCostsAwarded),
            previousPreCertificateCosts: formatAmount(
              claim.financialRecoveryPreviousPreCertificateCosts,
            ),
            payingParty: claim.payingParty ?? PLACEHOLDER_VALUE,
          }
        : undefined,
    financialRecoveryCosts:
      hasValue(claim.financialRecoveryCost) ||
      hasValue(claim.financialRecoveryDamages) ||
      hasValue(claim.financialRecoveryInterest) ||
      hasValue(claim.financialRecoveryPreviousPreCertificateCosts)
        ? {
            costs: formatAmount(claim.financialRecoveryCost),
            damages: formatAmount(claim.financialRecoveryDamages),
            interest: formatAmount(claim.financialRecoveryInterest),
            previousPreCertificateCosts: formatAmount(
              claim.financialRecoveryPreviousPreCertificateCosts,
            ),
          }
        : undefined,
  };
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

  return claim.claimEvidence.map((evidence) =>
    mapEvidenceRow(
      evidence.fileName,
      evidence.claimEvidenceId,
      applicationId,
      claimId,
    ),
  );
}

function mapEvidenceRow(
  fileName: string,
  evidenceId: string,
  applicationId: string,
  claimId: string,
): ClaimAssessmentEvidenceRow {
  const basePath = `/applications/${applicationId}/claims/${claimId}/evidence`;

  return {
    fileName,
    viewHref: `${basePath}/${evidenceId}?disposition=${DISPOSITION.INLINE}`,
    downloadHref: `${basePath}/${evidenceId}?disposition=${DISPOSITION.ATTACHMENT}`,
  };
}
