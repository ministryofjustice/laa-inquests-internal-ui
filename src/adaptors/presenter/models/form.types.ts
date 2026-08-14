export interface FormErrorMessage {
  text: string;
  href?: string;
}

export interface AssessClaimForm {
  assessClaim: string;
  "rejection-reason": string;
}

export interface AssessClaimFormErrors {
  assessClaim?: FormErrorMessage;
  rejectionReason?: FormErrorMessage;
}
