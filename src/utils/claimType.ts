import { CLAIM_TYPES } from "#src/infrastructure/locales/constants.js";

const CLAIM_TYPE_LABELS = CLAIM_TYPES as Record<string, string | undefined>;

export function mapClaimType(claimTypeId: string): string {
  const { [claimTypeId]: claimTypeLabel } = CLAIM_TYPE_LABELS;

  if (claimTypeLabel === undefined) {
    throw new Error(`Unknown claim type: ${claimTypeId}`);
  }

  return claimTypeLabel;
}
