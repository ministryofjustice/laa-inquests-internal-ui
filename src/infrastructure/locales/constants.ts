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

export const PAYABLE_CLAIM_STATUSES = ["ACCEPTED", "PAY_IN_FULL"];

export const PLACEHOLDER_VALUE = "-";

export const DISPOSITION = {
  INLINE: "inline",
  ATTACHMENT: "attachment",
} as const;

export type Disposition = (typeof DISPOSITION)[keyof typeof DISPOSITION];

export enum HISTORY_EVENT_REFERENCE {
  EVT_BUS_APP_001 = "EVT-BUS-APP-001",
  EVT_BUS_APP_002 = "EVT-BUS-APP-002",
  EVT_BUS_APP_003 = "EVT-BUS-APP-003",
  EVT_BUS_APP_004 = "EVT-BUS-APP-004",

  EVT_BUS_CLM_001 = "EVT-BUS-CLM-001",
  EVT_BUS_CLM_002 = "EVT-BUS-CLM-002",
  EVT_BUS_CLM_003 = "EVT-BUS-CLM-003",
  EVT_BUS_CLM_004 = "EVT-BUS-CLM-004",

  EVT_COM_APP_001 = "EVT-COM-APP-001",
  EVT_COM_APP_002 = "EVT-COM-APP-002",
  EVT_COM_APP_003 = "EVT-COM-APP-003",
  EVT_COM_APP_004 = "EVT-COM-APP-004",

  EVT_COM_CLM_001 = "EVT-COM-CLM-001",
  EVT_COM_CLM_002 = "EVT-COM-CLM-002",
}
