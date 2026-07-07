import type {
  ApplicationDecisionForm,
  ApplicationDecisionFormErrors,
  JustificationForm,
  JustificationFormErrors,
  CertificateStartDateForm,
  CertificateStartDateFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import {
  JUSTIFICATION_MAX_CHARACTER_LENGTH,
  DATE_RADIX,
  MIN_DAY,
  MAX_DAY,
  MIN_MONTH,
  MAX_MONTH,
  MONTH_OFFSET,
  MIN_YEAR,
} from "#src/infrastructure/locales/constants.js";

export class ApplicationDecisionValidator extends FormValidator {
  validateApplicationDecisionForm(
    form: ApplicationDecisionForm,
  ): Partial<ApplicationDecisionFormErrors> {
    const errors: Partial<ApplicationDecisionFormErrors> = {};

    if (!form["overall-decision"]) {
      errors.overallDecision = {
        text: en.pages.decision.merits.radio.validationError.notEmpty,
      };
    }

    return errors;
  }

  validateJustification(
    form: JustificationForm,
  ): Partial<JustificationFormErrors> {
    const errors: Partial<JustificationFormErrors> = {};

    const { "refusal-reason": refusalReason, justification } = form;

    if (!refusalReason) {
      errors.decisionReason = {
        text: en.pages.decision.justification.radio.validationErrors.notEmpty,
      };
    }

    if (!justification) {
      errors.decisionJustification = {
        text: en.pages.decision.justification.textarea.validationErrors
          .notEmpty,
      };
    } else if (justification.length > JUSTIFICATION_MAX_CHARACTER_LENGTH) {
      errors.decisionJustification = {
        text: en.pages.decision.justification.textarea.validationErrors.tooLong,
      };
    } else if (this.hasInvalidUnicodeCharacters(justification)) {
      errors.decisionJustification = {
        text: en.pages.decision.justification.textarea.validationErrors
          .invalidCharacters,
      };
    }

    return errors;
  }

  validateCertificateStartDate(
    form: CertificateStartDateForm,
  ): Partial<CertificateStartDateFormErrors> {
    const errors: Partial<CertificateStartDateFormErrors> = {};

    const {
      "start-date-day": dayInput,
      "start-date-month": monthInput,
      "start-date-year": yearInput,
    } = form;
    const dayValue = dayInput.trim();
    const monthValue = monthInput.trim();
    const yearValue = yearInput.trim();

    if (!dayValue && !monthValue && !yearValue) {
      errors.certificateStartDate = {
        text: en.pages.decision.certificateStartDate.validationErrors.notEmpty,
      };
      return errors;
    }

    const parsedDate = this.#parseCertificateStartDate(
      dayValue,
      monthValue,
      yearValue,
    );

    if (!parsedDate) {
      errors.certificateStartDate = {
        text: en.pages.decision.certificateStartDate.validationErrors
          .invalidDate,
      };
      return errors;
    }

    if (this.#isFutureDate(parsedDate)) {
      errors.certificateStartDate = {
        text: en.pages.decision.certificateStartDate.validationErrors.future,
      };
    }

    return errors;
  }

  #parseCertificateStartDate(
    dayValue: string,
    monthValue: string,
    yearValue: string,
  ): Date | null {
    const day = Number.parseInt(dayValue, DATE_RADIX);
    const month = Number.parseInt(monthValue, DATE_RADIX);
    const year = Number.parseInt(yearValue, DATE_RADIX);

    if (!this.#isWithinDateRange(day, month, year)) {
      return null;
    }

    const date = new Date(year, month - MONTH_OFFSET, day);
    const isRealDate =
      date.getFullYear() === year &&
      date.getMonth() === month - MONTH_OFFSET &&
      date.getDate() === day;

    return isRealDate ? date : null;
  }

  #isWithinDateRange(day: number, month: number, year: number): boolean {
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
      return false;
    }
    if (day < MIN_DAY || day > MAX_DAY) {
      return false;
    }
    if (month < MIN_MONTH || month > MAX_MONTH) {
      return false;
    }
    return year >= MIN_YEAR;
  }

  #isFutureDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime();
  }
}
