import {
  PENDING_DECISION,
  SUBMITTED_DECISION,
} from "#src/infrastructure/locales/constants.js";

export function formatCurrency(amount: number): string {
  const hasDecimals = amount % 1 !== 0;

  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

export function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// TODO(IDDS-727): the API is moving from PENDING to SUBMITTED for application overallDecision.
// Remove the PENDING_DECISION check once the API only returns SUBMITTED.
export function isPendingDecision(overallDecision?: string | null): boolean {
  if (!overallDecision) {
    return true;
  }

  const upperValue = overallDecision.toUpperCase();
  return upperValue === PENDING_DECISION || upperValue === SUBMITTED_DECISION;
}
