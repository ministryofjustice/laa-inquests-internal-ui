import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";
import { CLAIM_TYPES } from "#src/infrastructure/locales/constants.js";

const CLAIM_TYPE_LABELS = CLAIM_TYPES as Record<string, string | undefined>;

function parseCost(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * The billed value of a claim, as resolved by the API. FINAL_BILL/NIL_BILL
 * claims don't carry a totalAmount — fall back to the gross profit cost.
 */
export function getClaimCost(claim: ClaimSummary): number {
  const isFinalOrNilBill =
    claim.claimTypeId === "FINAL_BILL" || claim.claimTypeId === "NIL_BILL";

  if (isFinalOrNilBill) {
    return (
      parseCost(claim.totalAmount) ?? parseCost(claim.totalProfitCostGross) ?? 0
    );
  }

  return parseCost(claim.totalAmount) ?? 0;
}

export function mapClaimType(claimTypeId: string): string {
  const { [claimTypeId]: claimTypeLabel } = CLAIM_TYPE_LABELS;

  if (claimTypeLabel === undefined) {
    throw new Error(`Unknown claim type: ${claimTypeId}`);
  }

  return claimTypeLabel;
}
