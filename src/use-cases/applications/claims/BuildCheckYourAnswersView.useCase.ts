import type { ClaimDetail } from "#src/adaptors/models/claim.types.js";
import {
  CLAIM_DECISION_STATUSES,
  PLACEHOLDER_VALUE,
} from "#src/infrastructure/locales/constants.js";
import type { ClaimsPort } from "#src/ports/inquests-api/claims/ClaimsAPI/ClaimsAPI.port.js";
import {
  TECHNICAL_FAILURE_REASONS,
  type UseCaseResult,
} from "#src/use-cases/common/useCaseResult.types.js";
import { formatCurrency } from "#src/utils/formatter.js";

export interface CheckYourAnswersCostTotals {
  netTotal?: string;
  grossTotal?: string;
  zeroVatTotal?: string;
}

interface BuildCheckYourAnswersViewInput {
  laaReference: string;
  claimId: string;
  claimsPort: ClaimsPort;
  accessToken?: string;
  profitCosts: CheckYourAnswersCostTotals;
  disbursementCosts: CheckYourAnswersCostTotals;
}

export interface CheckYourAnswersFormattedCostTotals {
  netTotal: string;
  grossTotal: string;
  zeroVatTotal: string;
}

export interface CheckYourAnswersViewData {
  laaReference: string;
  claimId: string;
  finalBill: string;
  claimDecision: string;
  profitCosts: CheckYourAnswersFormattedCostTotals;
  disbursementCosts: CheckYourAnswersFormattedCostTotals;
}

export class BuildCheckYourAnswersViewUseCase {
  async execute(
    input: BuildCheckYourAnswersViewInput,
  ): Promise<UseCaseResult<CheckYourAnswersViewData>> {
    if (!input.laaReference || !input.claimId) {
      return {
        status: "TECHNICAL_FAILURE",
        reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,
        message:
          "Cannot build check your answers view without laaReference and claimId",
      };
    }

    try {
      const claim = await input.claimsPort.getClaimById(
        input.laaReference,
        input.claimId,
        input.accessToken,
      );

      return {
        status: "SUCCESS",
        data: {
          laaReference: input.laaReference,
          claimId: input.claimId,
          finalBill: formatAmount(getPaymentAmountRaw(claim)),
          claimDecision: CLAIM_DECISION_STATUSES.PAY_IN_FULL,
          profitCosts: formatCostTotals(input.profitCosts),
          disbursementCosts: formatCostTotals(input.disbursementCosts),
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

function formatCostTotals(
  totals: CheckYourAnswersCostTotals,
): CheckYourAnswersFormattedCostTotals {
  return {
    netTotal: formatAmount(totals.netTotal),
    grossTotal: formatAmount(totals.grossTotal),
    zeroVatTotal: formatAmount(totals.zeroVatTotal),
  };
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

// Mirrors getPaymentAmountRaw in BuildClaimAssessmentView.useCase.ts to derive the same "Final bill" figure.
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
