import type { FormErrorMessage } from "#src/adaptors/presenter/models/form.types.js";

export interface ConfirmProfitCostsForm {
  "net-total": string;
  "gross-total": string;
  "zero-vat-total": string;
}

export interface ConfirmProfitCostsFormErrors {
  netTotal?: FormErrorMessage;
  grossTotal?: FormErrorMessage;
  zeroVatTotal?: FormErrorMessage;
  totalRequired?: FormErrorMessage;
}
