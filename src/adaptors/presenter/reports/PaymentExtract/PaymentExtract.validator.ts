import type {
  PaymentExtractForm,
  PaymentExtractFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import { DATE_MONTH_INDEX_OFFSET } from "#src/infrastructure/locales/constants.js";

const {
  pages: {
    reports: {
      paymentExtract: { validationErrors },
    },
  },
} = en;

interface DateParts {
  day: string;
  month: string;
  year: string;
}

export class PaymentExtractValidator extends FormValidator {
  validatePaymentExtractForm(
    form: PaymentExtractForm,
  ): Partial<PaymentExtractFormErrors> {
    const errors: Partial<PaymentExtractFormErrors> = {};
    const from = this.#dateParts(form, "from");
    const to = this.#dateParts(form, "to");

    const fromError = this.validateDateInput(from.day, from.month, from.year, {
      missing: validationErrors.fromMissing,
      nonNumeric: validationErrors.fromInvalid,
      invalidDate: validationErrors.fromInvalid,
      futureDate: validationErrors.fromFuture,
    });
    if (fromError !== undefined) {
      errors.fromDate = { text: fromError };
    }

    const toError = this.validateDateInput(to.day, to.month, to.year, {
      missing: validationErrors.toMissing,
      nonNumeric: validationErrors.toInvalid,
      invalidDate: validationErrors.toInvalid,
      futureDate: validationErrors.toFuture,
    });
    if (toError !== undefined) {
      errors.toDate = { text: toError };
    } else if (
      fromError === undefined &&
      this.#toDate(to) < this.#toDate(from)
    ) {
      errors.toDate = { text: validationErrors.toBeforeFrom };
    }

    return errors;
  }

  #dateParts(form: PaymentExtractForm, prefix: "from" | "to"): DateParts {
    return {
      day: form[`${prefix}-date-day`].trim(),
      month: form[`${prefix}-date-month`].trim(),
      year: form[`${prefix}-date-year`].trim(),
    };
  }

  #toDate({ day, month, year }: DateParts): Date {
    return new Date(
      Number(year),
      Number(month) - DATE_MONTH_INDEX_OFFSET,
      Number(day),
    );
  }
}
