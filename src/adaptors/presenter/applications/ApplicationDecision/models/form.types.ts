import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface ApplicationDecisionForm {
  "overall-decision": string;
}

export interface ApplicationDecisionFormErrors {
  overallDecision?: FormErrorMessage;
}

export interface JustificationForm {
  "refusal-reason": string;
  justification: string;
}

export interface JustificationFormErrors {
  decisionReason?: FormErrorMessage;
  decisionJustification?: FormErrorMessage;
}

export interface CertificateStartDateForm {
  "start-date-option": string;
  "start-date-day": string;
  "start-date-month": string;
  "start-date-year": string;
}

export interface CertificateStartDateFormErrors {
  certificateStartDateOption?: FormErrorMessage;
  certificateStartDate?: FormErrorMessage;
}
