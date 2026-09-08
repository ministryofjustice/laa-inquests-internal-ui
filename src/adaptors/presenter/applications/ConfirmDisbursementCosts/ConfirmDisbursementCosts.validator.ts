import type {
  ConfirmDisbursementCostsForm,
  ConfirmDisbursementCostsFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";

interface DisbursementCostsTotals {
  netTotal: string;
  grossTotal: string;
  zeroVatTotal: string;
}

const NIL_TOTAL = 0;

export class ConfirmDisbursementCostsValidator extends FormValidator {
  validateConfirmDisbursementCostsForm(
    form: ConfirmDisbursementCostsForm,
  ): Partial<ConfirmDisbursementCostsFormErrors> {
    const {
      "net-total": netTotal,
      "gross-total": grossTotal,
      "zero-vat-total": zeroVatTotal,
    } = form;

    const totals: DisbursementCostsTotals = {
      netTotal: netTotal.trim(),
      grossTotal: grossTotal.trim(),
      zeroVatTotal: zeroVatTotal.trim(),
    };

    const formatErrors = this.#validateFormats(totals);
    if (Object.keys(formatErrors).length > EMPTY_ARR_LENGTH) {
      return formatErrors;
    }

    return this.#validateTotalsCombination(totals);
  }

  #validateFormats(
    totals: DisbursementCostsTotals,
  ): Partial<ConfirmDisbursementCostsFormErrors> {
    const { netTotal, grossTotal, zeroVatTotal } = totals;
    const errors: Partial<ConfirmDisbursementCostsFormErrors> = {};

    if (netTotal !== "" && !this.isValidMonetaryFormat(netTotal)) {
      errors.netTotal = {
        text: en.pages.claimAssessment.confirmDisbursementCosts.validationErrors
          .netFormat,
      };
    }
    if (grossTotal !== "" && !this.isValidMonetaryFormat(grossTotal)) {
      errors.grossTotal = {
        text: en.pages.claimAssessment.confirmDisbursementCosts.validationErrors
          .grossFormat,
      };
    }
    if (zeroVatTotal !== "" && !this.isValidMonetaryFormat(zeroVatTotal)) {
      errors.zeroVatTotal = {
        text: en.pages.claimAssessment.confirmDisbursementCosts.validationErrors
          .zeroVatFormat,
      };
    }

    return errors;
  }

  #validateTotalsCombination(
    totals: DisbursementCostsTotals,
  ): Partial<ConfirmDisbursementCostsFormErrors> {
    const isNetEmpty = totals.netTotal === "";
    const isGrossEmpty = totals.grossTotal === "";
    const isZeroVatEmpty = totals.zeroVatTotal === "";
    const emptiness = { isNetEmpty, isGrossEmpty, isZeroVatEmpty };

    return (
      this.#checkAllTotalsEmpty(emptiness) ??
      this.#checkMissingPair(emptiness) ??
      this.#checkVatConflict(emptiness) ??
      this.#checkgrossLessThanNet(totals, emptiness) ??
      {}
    );
  }

  #checkAllTotalsEmpty(emptiness: {
    isNetEmpty: boolean;
    isGrossEmpty: boolean;
    isZeroVatEmpty: boolean;
  }): Partial<ConfirmDisbursementCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty, isZeroVatEmpty } = emptiness;

    if (isNetEmpty && isGrossEmpty && isZeroVatEmpty) {
      return {
        totalRequired: {
          text: en.pages.claimAssessment.confirmDisbursementCosts
            .validationErrors.totalRequired,
        },
      };
    }

    return undefined;
  }

  #checkMissingPair(emptiness: {
    isNetEmpty: boolean;
    isGrossEmpty: boolean;
  }): Partial<ConfirmDisbursementCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty } = emptiness;

    if (isNetEmpty === isGrossEmpty) {
      return undefined;
    }

    return isNetEmpty
      ? {
          netTotal: {
            text: en.pages.claimAssessment.confirmDisbursementCosts
              .validationErrors.netMissing,
          },
        }
      : {
          grossTotal: {
            text: en.pages.claimAssessment.confirmDisbursementCosts
              .validationErrors.grossMissing,
          },
        };
  }

  #checkVatConflict(emptiness: {
    isNetEmpty: boolean;
    isGrossEmpty: boolean;
    isZeroVatEmpty: boolean;
  }): Partial<ConfirmDisbursementCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty, isZeroVatEmpty } = emptiness;

    if (isNetEmpty || isGrossEmpty || isZeroVatEmpty) {
      return undefined;
    }

    const conflictError = {
      text: en.pages.claimAssessment.confirmDisbursementCosts.validationErrors
        .vatConflict,
    };
    return {
      netTotal: conflictError,
      grossTotal: conflictError,
      zeroVatTotal: conflictError,
    };
  }

  // Gross must exceed net only when the 0% VAT total is blank; a nil (0) gross is allowed.
  #checkgrossLessThanNet(
    totals: DisbursementCostsTotals,
    emptiness: {
      isNetEmpty: boolean;
      isGrossEmpty: boolean;
      isZeroVatEmpty: boolean;
    },
  ): Partial<ConfirmDisbursementCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty, isZeroVatEmpty } = emptiness;

    if (isNetEmpty || isGrossEmpty || !isZeroVatEmpty) {
      return undefined;
    }

    const grossValue = Number(totals.grossTotal);
    if (grossValue === NIL_TOTAL) {
      return undefined;
    }

    if (grossValue <= Number(totals.netTotal)) {
      return {
        grossTotal: {
          text: en.pages.claimAssessment.confirmDisbursementCosts
            .validationErrors.grossLessThanNet,
        },
      };
    }

    return undefined;
  }
}
