// Journey sequences for apply and claim flows
// Logic is accessing any page url must have lastCompletedStep set to the index of the page directly below it
// Setting is handled by completeStepAndRedirect, which will res.redirect to a page whilst also calling markCompleteStep

// export const APPLY_JOURNEY_SEQUENCE = [
//   "/apply",
//   "/apply/office-accounts",
//   "/apply/client-details/name-and-dob",
//   "/apply/client-details/nino",
//   "/apply/client-details/has-prev-application",
//   "/apply/client-details/home-address",
//   "/apply/client-details/correspondence-address-source", // Can jump to either correspondence-address or correspondence-recipient
//   "/apply/client-details/correspondence-address",
//   "/apply/client-details/correspondence-recipient",
//   "/apply/proceeding",
//   "/apply/deceased-details/name",
//   "/apply/deceased-details/dod",
//   "/apply/deceased-details/dob",
//   "/apply/deceased-details/client-relationship",
//   "/apply/deceased-details/coroner-reference",
//   "/apply/deceased-details/further-information",
//   "/apply/public-authority",
//   "/apply/upload-coroners-letter",
//   "/apply/check-your-answers",
//   "/apply/confirmation/client-declaration",
//   "/apply/confirmation/success",
// ];

// export const CLAIM_JOURNEY_SEQUENCE = [
//   "/claim",
//   "/claim/search",
//   "/claim/results",
//   "/claim/cannot-claim",
//   "/claim/type", // claim type (POA/Final bill) (branching paths will continue to POA, or final bill sequence and meetup and check your answers)
//   "/claim/subtype", // POA subtype
//   "/claim/total-cost",
//   "/claim/final-bill-template",
//   "/claim/evidence",
//   //Final Bill sequence
//   "/claim/counsel-number",
//   "/claim/counsel-pay-confirmation",
//   "/claim/end-date",
//   "/claim/inquest-outcome",
//   "/claim/funding-post-inquest",
//   "/claim/inquest-outcome-recovery",
//   "/claim/pre-cert-costs",
//   "/claim/recovery-costs",
//   "/claim/paying-party",
//   // All claims
//   "/claim/check-your-answers",
//   "/claim/confirmation/success",
//   "/claim/confirmation/reject",
// ];

const PUBLIC_AUTHORITY_JOURNEY_SEQUENCE = [
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/public-authorities",
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/public-authorities/confirm",
];

const CLAIMS_JOURNEY_DECISION_SEQUENCE = [
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}",
];

const APPLICATION_JOURNEY_DECISION_SEQUENCE = [
  "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision",
];

export const enum JOURNEY_TYPES {
  PUBLIC_AUTHORITY = 1,
  CLAIM_DECISION = 2,
  APPLICATION_DECISION = 3,
}

export const JOURNEYS = {
  [JOURNEY_TYPES.PUBLIC_AUTHORITY]: PUBLIC_AUTHORITY_JOURNEY_SEQUENCE,
  [JOURNEY_TYPES.CLAIM_DECISION]: CLAIMS_JOURNEY_DECISION_SEQUENCE,
  [JOURNEY_TYPES.APPLICATION_DECISION]: APPLICATION_JOURNEY_DECISION_SEQUENCE,
};
