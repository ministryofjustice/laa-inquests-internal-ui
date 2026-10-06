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
 * The billed value of a claim, as resolved by the API.
 */
export function getClaimCost(claim: ClaimSummary): number {
  return parseCost(claim.totalAmount) ?? 0;
}

export function mapClaimType(claimTypeId: string): string {
  const { [claimTypeId]: claimTypeLabel } = CLAIM_TYPE_LABELS;

  if (claimTypeLabel === undefined) {
    throw new Error(`Unknown claim type: ${claimTypeId}`);
  }

  return claimTypeLabel;
}
