import type {
  ConfirmProfitCostsForm,
  ConfirmProfitCostsFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";

interface ProfitCostsTotals {
  netTotal: string;
  grossTotal: string;
  zeroVatTotal: string;
}

export class ConfirmProfitCostsValidator extends FormValidator {
  validateConfirmProfitCostsForm(
    form: ConfirmProfitCostsForm,
  ): Partial<ConfirmProfitCostsFormErrors> {
    const {
      "net-total": netTotal,
      "gross-total": grossTotal,
      "zero-vat-total": zeroVatTotal,
    } = form;

    const totals: ProfitCostsTotals = {
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
    totals: ProfitCostsTotals,
  ): Partial<ConfirmProfitCostsFormErrors> {
    const { netTotal, grossTotal, zeroVatTotal } = totals;
    const errors: Partial<ConfirmProfitCostsFormErrors> = {};

    if (netTotal !== "" && !this.isValidMonetaryFormat(netTotal)) {
      errors.netTotal = {
        text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
          .netFormat,
      };
    }
    if (grossTotal !== "" && !this.isValidMonetaryFormat(grossTotal)) {
      errors.grossTotal = {
        text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
          .grossFormat,
      };
    }
    if (zeroVatTotal !== "" && !this.isValidMonetaryFormat(zeroVatTotal)) {
      errors.zeroVatTotal = {
        text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
          .zeroVatFormat,
      };
    }

    return errors;
  }

  #validateTotalsCombination(
    totals: ProfitCostsTotals,
  ): Partial<ConfirmProfitCostsFormErrors> {
    const isNetEmpty = totals.netTotal === "";
    const isGrossEmpty = totals.grossTotal === "";
    const isZeroVatEmpty = totals.zeroVatTotal === "";
    const emptiness = { isNetEmpty, isGrossEmpty, isZeroVatEmpty };

    return (
      this.#checkAllTotalsEmpty(emptiness) ??
      this.#checkMissingPair(emptiness) ??
      this.#checkVatConflict(emptiness) ??
      this.#checkGrossLessThanNet(totals, emptiness) ??
      {}
    );
  }

  #checkAllTotalsEmpty(emptiness: {
    isNetEmpty: boolean;
    isGrossEmpty: boolean;
    isZeroVatEmpty: boolean;
  }): Partial<ConfirmProfitCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty, isZeroVatEmpty } = emptiness;

    if (isNetEmpty && isGrossEmpty && isZeroVatEmpty) {
      return {
        totalRequired: {
          text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
            .totalRequired,
        },
      };
    }

    return undefined;
  }

  #checkMissingPair(emptiness: {
    isNetEmpty: boolean;
    isGrossEmpty: boolean;
  }): Partial<ConfirmProfitCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty } = emptiness;

    if (isNetEmpty === isGrossEmpty) {
      return undefined;
    }

    return isNetEmpty
      ? {
          netTotal: {
            text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
              .netMissing,
          },
        }
      : {
          grossTotal: {
            text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
              .grossMissing,
          },
        };
  }

  #checkVatConflict(emptiness: {
    isNetEmpty: boolean;
    isGrossEmpty: boolean;
    isZeroVatEmpty: boolean;
  }): Partial<ConfirmProfitCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty, isZeroVatEmpty } = emptiness;

    if (isNetEmpty || isGrossEmpty || isZeroVatEmpty) {
      return undefined;
    }

    const conflictError = {
      text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
        .vatConflict,
    };
    return {
      netTotal: conflictError,
      grossTotal: conflictError,
      zeroVatTotal: conflictError,
    };
  }

  #checkGrossLessThanNet(
    totals: ProfitCostsTotals,
    emptiness: { isNetEmpty: boolean; isGrossEmpty: boolean },
  ): Partial<ConfirmProfitCostsFormErrors> | undefined {
    const { isNetEmpty, isGrossEmpty } = emptiness;

    if (isNetEmpty || isGrossEmpty) {
      return undefined;
    }

    if (Number(totals.netTotal) > Number(totals.grossTotal)) {
      return {
        grossTotal: {
          text: en.pages.claimAssessment.confirmProfitCosts.validationErrors
            .grossLessThanNet,
        },
      };
    }

    return undefined;
  }
}
