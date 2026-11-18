const PUBLIC_AUTHORITY_JOURNEY_SEQUENCE = [
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/public-authorities",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/public-authorities/confirm",
];

const CLAIMS_JOURNEY_DECISION_SEQUENCE = [
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}",
  // Final bill - approve
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/confirm-profit-costs",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/confirm-disbursement-costs",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/check-your-answers",
  // outcomes
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/rejected",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/paid-in-full",
];

const APPLICATION_JOURNEY_DECISION_SEQUENCE = [
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision/justification",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision/certificate-start-date",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision/confirmation",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision/success",
];

export enum JOURNEY_TYPES {
  PUBLIC_AUTHORITY = 1,
  CLAIM_DECISION = 2,
  APPLICATION_DECISION = 3,
}

export const JOURNEYS = {
  [JOURNEY_TYPES.PUBLIC_AUTHORITY]: PUBLIC_AUTHORITY_JOURNEY_SEQUENCE,
  [JOURNEY_TYPES.CLAIM_DECISION]: CLAIMS_JOURNEY_DECISION_SEQUENCE,
  [JOURNEY_TYPES.APPLICATION_DECISION]: APPLICATION_JOURNEY_DECISION_SEQUENCE,
};
