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
