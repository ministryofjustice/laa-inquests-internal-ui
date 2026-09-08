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

export interface AddHistoryNoteForm {
  "note-text": string;
}

export interface AddHistoryNoteFormErrors {
  noteText?: FormErrorMessage;
}

export interface AddHistoryNoteValidationResult {
  errors: Partial<AddHistoryNoteFormErrors>;
  excessCount?: number;
}

export interface DisbursementCostsForm {
  "disbursement-cost-vat-zero": string;
  "disbursement-cost-net": string;
  "disbursement-cost-gross": string;
}

export interface DisbursementCostsFormErrors {
  disbursementCostVatZero?: FormErrorMessage;
  disbursementCostNet?: FormErrorMessage;
  disbursementCostGross?: FormErrorMessage;
}
