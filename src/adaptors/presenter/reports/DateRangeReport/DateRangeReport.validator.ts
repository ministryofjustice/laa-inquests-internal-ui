import type {
  DateField,
  DateRangeReportForm,
  DateRangeReportFormError,
  DateRangeReportFormErrors,
} from "./models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { FormValidator } from "#src/utils/FormValidator.js";
import {
  DATE_MONTH_INDEX_OFFSET,
  EMPTY_ARR_LENGTH,
} from "#src/infrastructure/locales/constants.js";

const {
  pages: {
    reports: {
      dateRange: {
        validationErrors,
        validationErrors: { missingParts },
      },
    },
  },
} = en;

const MISSING_PARTS_KEYS: Record<string, keyof typeof missingParts> = {
  day: "day",
  month: "month",
  year: "year",
  "day,month": "dayMonth",
  "day,year": "dayYear",
  "month,year": "monthYear",
};

const MS_PER_DAY = 86_400_000;
const ALL_DATE_FIELDS: DateField[] = ["day", "month", "year"];
const DAY_OR_MONTH_REGEX = /^\d{1,2}$/v;
const YEAR_REGEX = /^\d{4}$/v;
const PAD_LENGTH = 2;

interface DateParts {
  day: string;
  month: string;
  year: string;
}

export function buildDateRangeTooLongErrors(
  maxDays: number,
): Required<DateRangeReportFormErrors> {
  const text = validationErrors.dateRangeTooLong.replace(
    "{maxDays}",
    String(maxDays),
  );
  return {
    startDate: { text, fields: [...ALL_DATE_FIELDS] },
    endDate: { text, fields: [...ALL_DATE_FIELDS], inSummary: false },
  };
}

export class DateRangeReportValidator extends FormValidator {
  validateDateRangeReportForm(
    form: DateRangeReportForm,
    maxDays: number,
  ): Partial<DateRangeReportFormErrors> {
    const errors: Partial<DateRangeReportFormErrors> = {};
    const start = this.#dateParts(form, "start");
    const end = this.#dateParts(form, "end");

    const startError = this.#validateDate(start, {
      missing: validationErrors.startMissing,
      incomplete: validationErrors.startIncomplete,
      invalid: validationErrors.startInvalid,
      future: validationErrors.startFuture,
    });
    if (startError !== undefined) {
      errors.startDate = startError;
    }

    const endError = this.#validateDate(end, {
      missing: validationErrors.endMissing,
      incomplete: validationErrors.endIncomplete,
      invalid: validationErrors.endInvalid,
      future: validationErrors.endFuture,
    });
    if (endError !== undefined) {
      errors.endDate = endError;
    }

    if (startError === undefined && endError === undefined) {
      return this.#validateRange(start, end, maxDays);
    }
    return errors;
  }

  #validateDate(
    { day, month, year }: DateParts,
    messages: {
      missing: string;
      incomplete: string;
      invalid: string;
      future: string;
    },
  ): DateRangeReportFormError | undefined {
    const missingFields = ALL_DATE_FIELDS.filter(
      (field) => this.#datePart({ day, month, year }, field) === "",
    );

    if (missingFields.length === ALL_DATE_FIELDS.length) {
      return { text: messages.missing, fields: missingFields };
    }
    if (missingFields.length > EMPTY_ARR_LENGTH) {
      const { [MISSING_PARTS_KEYS[missingFields.join(",")] ?? "day"]: parts } =
        missingParts;
      return {
        text: messages.incomplete.replace("{parts}", parts),
        fields: missingFields,
      };
    }

    const hasValidFormat =
      DAY_OR_MONTH_REGEX.test(day) &&
      DAY_OR_MONTH_REGEX.test(month) &&
      YEAR_REGEX.test(year);
    const text = hasValidFormat
      ? this.validateDateInput(day, month, year, {
          missing: messages.missing,
          nonNumeric: messages.invalid,
          invalidDate: messages.invalid,
          futureDate: messages.future,
        })
      : messages.invalid;

    return text === undefined
      ? undefined
      : { text, fields: [...ALL_DATE_FIELDS] };
  }

  #validateRange(
    start: DateParts,
    end: DateParts,
    maxDays: number,
  ): Partial<DateRangeReportFormErrors> {
    const daysBetween =
      (this.#utcTime(end) - this.#utcTime(start)) / MS_PER_DAY;
    if (daysBetween < 0) {
      return {
        startDate: {
          text: validationErrors.startAfterEnd.replace(
            "{endDate}",
            this.#displayDate(end),
          ),
          fields: [...ALL_DATE_FIELDS],
        },
        endDate: {
          text: validationErrors.endBeforeStart.replace(
            "{startDate}",
            this.#displayDate(start),
          ),
          fields: [...ALL_DATE_FIELDS],
        },
      };
    }
    // Both the start and end dates count towards the range.
    if (daysBetween + 1 > maxDays) {
      return buildDateRangeTooLongErrors(maxDays);
    }
    return {};
  }

  #displayDate({ day, month, year }: DateParts): string {
    return `${day.padStart(PAD_LENGTH, "0")}/${month.padStart(PAD_LENGTH, "0")}/${year}`;
  }

  #datePart(parts: DateParts, field: DateField): string {
    const { [field]: value } = parts;
    return value;
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
