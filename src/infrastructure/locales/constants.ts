export const MAX_CHARACTER_LENGTH = 100;
export const JUSTIFICATION_MAX_CHARACTER_LENGTH = 1500;
export const EMPTY_ARR_LENGTH = 0;

export const GRANTED_DECISION = "GRANTED";
export const REFUSED_DECISION = "REFUSED";
export const PENDING_DECISION = "PENDING";

export const DATE_MONTH_INDEX_OFFSET = 1;

export enum APPLICATION_TYPES {
  INITIAL = "Initial application",
}

export enum APPLICATION_STATUSES {
  LIVE = "Live",
}

export enum CERTIFICATE_TYPES {
  SUBSTANTIVE = "Substantive",
}

export enum CLIENT_ROLES {
  RESPONDENT = "Respondent",
}

export enum LEVELS_OF_SERVICE {
  FULL_REPRESENTATION = "Full representation",
}

export enum SCOPE_OF_LIMITATIONS {
  FINAL_HEARING = "Final hearing",
}

export enum CATEGORIES_OF_LAW {
  INQUESTS = "Inquests",
}

export enum CLAIM_TYPES {
  PAYMENT_ON_ACCOUNT = "Payment on account",
}

export enum CLAIM_STATUSES {
  SUBMITTED = "Submitted",
  ACCEPTED = "Accepted",
  PAY_IN_FULL = "Pay in full",
  REJECTED = "Rejected",
  REJECTED_WITH_AMENDMENT = "Rejected with amendment",
}

export enum CLAIM_DECISION_STATUSES {
  REJECT = "Reject",
  GRANT = "Grant",
  PAY_IN_FULL = "Pay in full",
  PENDING = "Pending",
}
