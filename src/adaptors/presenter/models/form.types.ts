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
