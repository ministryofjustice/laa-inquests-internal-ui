import type {
  DateRangeReportForm,
  DateRangeReportFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import { DATE_MONTH_INDEX_OFFSET } from "#src/infrastructure/locales/constants.js";

const {
  pages: {
    reports: {
      dateRange: { validationErrors },
    },
  },
} = en;

const MS_PER_DAY = 86_400_000;

interface DateParts {
  day: string;
  month: string;
  year: string;
}

export class DateRangeReportValidator extends FormValidator {
  validateDateRangeReportForm(
    form: DateRangeReportForm,
    maxDays: number,
  ): Partial<DateRangeReportFormErrors> {
    const errors: Partial<DateRangeReportFormErrors> = {};
    const start = this.#dateParts(form, "start");
    const end = this.#dateParts(form, "end");

    const startError = this.validateDateInput(
      start.day,
      start.month,
      start.year,
      {
        missing: validationErrors.startMissing,
        nonNumeric: validationErrors.startInvalid,
        invalidDate: validationErrors.startInvalid,
        futureDate: validationErrors.startFuture,
      },
    );
    if (startError !== undefined) {
      errors.startDate = { text: startError };
    }

    const endError = this.validateDateInput(end.day, end.month, end.year, {
      missing: validationErrors.endMissing,
      nonNumeric: validationErrors.endInvalid,
      invalidDate: validationErrors.endInvalid,
      futureDate: validationErrors.endFuture,
    });
    if (endError !== undefined) {
      errors.endDate = { text: endError };
    } else if (startError === undefined) {
      const rangeError = this.#validateRange(start, end, maxDays);
      if (rangeError !== undefined) {
        errors.endDate = { text: rangeError };
      }
    }

    return errors;
  }

  #validateRange(
    start: DateParts,
    end: DateParts,
    maxDays: number,
  ): string | undefined {
    const daysBetween =
      (this.#utcTime(end) - this.#utcTime(start)) / MS_PER_DAY;
    if (daysBetween < 0) {
      return validationErrors.endBeforeStart;
    }
    // Both the start and end dates count towards the range.
    if (daysBetween + 1 > maxDays) {
      return validationErrors.dateRangeTooLong.replace(
        "{maxDays}",
        String(maxDays),
      );
    }
    return undefined;
  }

  #dateParts(form: DateRangeReportForm, prefix: "start" | "end"): DateParts {
    return {
      day: form[`${prefix}-date-day`].trim(),
      month: form[`${prefix}-date-month`].trim(),
      year: form[`${prefix}-date-year`].trim(),
    };
  }

  // UTC keeps the day count whole across clock changes.
  #utcTime({ day, month, year }: DateParts): number {
    return Date.UTC(
      Number(year),
      Number(month) - DATE_MONTH_INDEX_OFFSET,
      Number(day),
    );
  }
}
