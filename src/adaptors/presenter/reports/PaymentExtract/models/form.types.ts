import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface PaymentExtractForm {
  "from-date-day": string;
  "from-date-month": string;
  "from-date-year": string;
  "to-date-day": string;
  "to-date-month": string;
  "to-date-year": string;
}

export interface PaymentExtractFormErrors {
  fromDate?: FormErrorMessage;
  toDate?: FormErrorMessage;
}
