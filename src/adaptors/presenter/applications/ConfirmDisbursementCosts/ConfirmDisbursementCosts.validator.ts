import type {
  DisbursementCostsForm,
  DisbursementCostsFormErrors,
} from "#src/adaptors/presenter/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";

export class ConfirmDisbursementCostsValidator extends FormValidator {
  validateDisbursementCostsForm(
    form: DisbursementCostsForm,
  ): Partial<DisbursementCostsFormErrors> {
    const errors: Partial<DisbursementCostsFormErrors> = {};

    const vatZeroError = this.validateCurrencyInput(
      form["disbursement-cost-vat-zero"],
      {
        missing: en.pages.disbursementCosts.validationErrors.vatZero.notEmpty,
        invalid: en.pages.disbursementCosts.validationErrors.vatZero.invalid,
        negative: en.pages.disbursementCosts.validationErrors.vatZero.negative,
      },
    );
    if (vatZeroError) {
      errors.disbursementCostVatZero = { text: vatZeroError };
    }

    const netError = this.validateCurrencyInput(form["disbursement-cost-net"], {
      missing: en.pages.disbursementCosts.validationErrors.net.notEmpty,
      invalid: en.pages.disbursementCosts.validationErrors.net.invalid,
      negative: en.pages.disbursementCosts.validationErrors.net.negative,
    });
    if (netError) {
      errors.disbursementCostNet = { text: netError };
    }

    const grossError = this.validateCurrencyInput(
      form["disbursement-cost-gross"],
      {
        missing: en.pages.disbursementCosts.validationErrors.gross.notEmpty,
        invalid: en.pages.disbursementCosts.validationErrors.gross.invalid,
        negative: en.pages.disbursementCosts.validationErrors.gross.negative,
      },
    );
    if (grossError) {
      errors.disbursementCostGross = { text: grossError };
    }

    return errors;
  }
}
