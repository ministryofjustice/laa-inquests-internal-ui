import moment from "moment";
import {
  MAX_CHARACTER_LENGTH,
  DATE_MONTH_INDEX_OFFSET,
} from "#src/infrastructure/locales/constants.js";

export class FormValidator {
  protected exceedsMaxLength(
    inputValue: string | undefined,
    maxLength: number,
  ): boolean {
    return typeof inputValue === "string" && inputValue.length > maxLength;
  }

  protected validateFormInputValue(
    inputValue: string | undefined,
    checkIsEmpty = true,
  ): boolean {
    return checkIsEmpty
      ? typeof inputValue === "string" && inputValue === ""
      : this.exceedsMaxLength(inputValue, MAX_CHARACTER_LENGTH);
  }

  protected hasInvalidUnicodeCharacters(value: string): boolean {
    return !value.isWellFormed();
  }

  protected checkDateFieldsAreEmpty(
    day: string | undefined,
    month: string | undefined,
    year: string | undefined,
  ): boolean {
    const isDayEmpty = this.validateFormInputValue(day, true);
    const isMonthEmpty = this.validateFormInputValue(month, true);
    const isYearEmpty = this.validateFormInputValue(year, true);

    return isDayEmpty || isMonthEmpty || isYearEmpty;
  }

  protected checkDateIsNotANumber(
    day: string | undefined,
    month: string | undefined,
    year: string | undefined,
  ): boolean {
    const isDayNaN = isNaN(parseInt(day ?? "", 10));
    const isMonthNaN = isNaN(parseInt(month ?? "", 10));
    const isYearNaN = isNaN(parseInt(year ?? "", 10));
    return isDayNaN || isMonthNaN || isYearNaN;
  }

  protected checkDateIsValid(
    day: string | undefined,
    month: string | undefined,
    year: string | undefined,
  ): boolean {
    const dayNum = Number(day);
    const monthNum = Number(month);
    const yearNum = Number(year);

    return moment([
      yearNum,
      monthNum - DATE_MONTH_INDEX_OFFSET,
      dayNum,
    ]).isValid();
  }

  protected validateDateInput(
    day: string | undefined,
    month: string | undefined,
    year: string | undefined,
    errors: {
      missing: string;
      nonNumeric: string;
      invalidDate: string;
      futureDate: string;
    },
  ): string | undefined {
    if (this.checkDateFieldsAreEmpty(day, month, year)) {
      return errors.missing;
    }

    if (this.checkDateIsNotANumber(day, month, year)) {
      return errors.nonNumeric;
    }

    if (!this.checkDateIsValid(day, month, year)) {
      return errors.invalidDate;
    }

    const date = moment([
      Number(year),
      Number(month) - DATE_MONTH_INDEX_OFFSET,
      Number(day),
    ]);
    if (date.toDate() > new Date()) {
      return errors.futureDate;
    }

    return undefined;
  }

  protected validateMinMaxLength(
    inputValue: string | undefined,
    minLength: number,
    maxLength: number,
  ): boolean {
    return (
      typeof inputValue === "string" &&
      (inputValue.length < minLength || inputValue.length > maxLength)
    );
  }
}
