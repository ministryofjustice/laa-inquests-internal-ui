import type { ClaimSummary } from "#src/adaptors/models/claim.types.js";

function parseCost(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * The billed value of a claim.
 *
 * A profit-cost claim is submitted through one of two mutually exclusive VAT
 * routes: the 20% VAT route (net + gross, where gross is the VAT-inclusive
 * total) or the 0% VAT route (vat zero total). Net excludes VAT so it is never
 * the billed amount. Gross therefore takes precedence, falling back to the
 * vat zero total, and finally to 0 when neither is present.
 */
export function getClaimCost(claim: ClaimSummary): number {
  const gross = parseCost(claim.totalProfitCostGross);
  if (gross !== undefined) {
    return gross;
  }

  const vatZeroTotal = parseCost(claim.totalProfitCostVatZero);
  if (vatZeroTotal !== undefined) {
    return vatZeroTotal;
  }

  return 0;
}
