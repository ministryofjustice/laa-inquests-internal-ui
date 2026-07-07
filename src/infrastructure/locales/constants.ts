export const MAX_CHARACTER_LENGTH = 100;
export const JUSTIFICATION_MAX_CHARACTER_LENGTH = 1500;
export const EMPTY_ARR_LENGTH = 0;

// TODO: Look at these
// We want a generic date handler. Do these variables even make sense?
export const DATE_RADIX = 10;
export const MIN_MONTH = 1;
export const MAX_MONTH = 12;
export const DATE_MONTH_INDEX_OFFSET = 1;
export const MIN_DAY = 1;
export const MAX_DAY = 31;
export const MIN_YEAR = 1000;

export const GRANTED_DECISION = "GRANTED";

export const APPLICATION_TYPES = [
  {
    applicationTypeId: "INITIAL",
    applicationTypeDescription: "Initial application",
  },
];

export const CERTIFICATE_TYPES = [
  {
    certificateTypeId: "SUBSTANTIVE",
    certificateTypeDescription: "Substantive",
  },
];

export const CLIENT_ROLES = [
  {
    clientRoleId: "RESPONDENT",
    clientRoleDescription: "Respondent",
  },
];

export const LEVEL_OF_SERVICE = [
  {
    levelOfServiceId: "FULL_REPRESENTATION",
    levelOfServiceDescription: "Full representation",
  },
];

export const SCOPE_OF_LIMITATION = [
  {
    scopeOfLimitationId: "FINAL_HEARING",
    lscopeOfLimitationDescription: "Final hearing",
  },
];
