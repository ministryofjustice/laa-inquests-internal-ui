import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface ConfirmDisbursementCostsForm {
  "net-total": string;
  "gross-total": string;
  "zero-vat-total": string;
}

export interface ConfirmDisbursementCostsFormErrors {
  netTotal?: FormErrorMessage;
  grossTotal?: FormErrorMessage;
  zeroVatTotal?: FormErrorMessage;
  totalRequired?: FormErrorMessage;
}
