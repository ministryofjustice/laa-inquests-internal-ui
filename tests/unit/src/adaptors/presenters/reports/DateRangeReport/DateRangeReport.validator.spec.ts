import { strict as assert } from "assert";
import sinon from "sinon";
import {
  buildDateRangeTooLongErrors,
  DateRangeReportValidator,
} from "#src/adaptors/presenter/reports/DateRangeReport/DateRangeReport.validator.js";
import type { DateRangeReportForm } from "#src/adaptors/presenter/reports/DateRangeReport/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const validationErrors = en.pages.reports.dateRange.validationErrors;
const MAX_DAYS = 30;

describe("DateRangeReportValidator", () => {
  let validator: DateRangeReportValidator;

  const buildForm = (
    overrides: Partial<DateRangeReportForm> = {},
  ): DateRangeReportForm => ({
    "start-date-day": "1",
    "start-date-month": "4",
    "start-date-year": "2025",
    "end-date-day": "30",
    "end-date-month": "4",
    "end-date-year": "2025",
    ...overrides,
  });

  const ALL = ["day", "month", "year"];
  const tooLong = (maxDays: number) => buildDateRangeTooLongErrors(maxDays);

  beforeEach(() => {
    validator = new DateRangeReportValidator();
  });

  it("returns errors for both dates when nothing is entered", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({
        "start-date-day": "",
        "start-date-month": "",
        "start-date-year": "",
        "end-date-day": "",
        "end-date-month": "",
        "end-date-year": "",
      }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startMissing, fields: ALL },
      endDate: { text: validationErrors.endMissing, fields: ALL },
    });
  });

  it("returns no errors when the date range is valid", () => {
    assert.deepStrictEqual(
      validator.validateDateRangeReportForm(buildForm(), MAX_DAYS),
      {},
    );
  });

  it("returns no errors when the end date equals the start date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "end-date-day": "1" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns no errors when the date fields have surrounding whitespace", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-day": " 1 ", "end-date-year": " 2025 " }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns a start date missing error when the start date fields contain only spaces", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({
        "start-date-day": " ",
        "start-date-month": " ",
        "start-date-year": " ",
      }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startMissing, fields: ALL },
    });
  });

  it("returns a start date error when the start date is not a real date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-day": "31", "start-date-month": "2" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startInvalid, fields: ALL },
    });
  });

  it("returns a start date error when the start date is not numeric", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({
        "start-date-day": "a",
        "start-date-month": "b",
        "start-date-year": "c",
      }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startInvalid, fields: ALL },
    });
  });

  it("returns an end date error when the end date is not a real date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "end-date-day": "31" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      endDate: { text: validationErrors.endInvalid, fields: ALL },
    });
  });

  it("returns errors when both dates are in the future", () => {
    const nextYear = String(new Date().getFullYear() + 1);
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-year": nextYear, "end-date-year": nextYear }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startFuture, fields: ALL },
      endDate: { text: validationErrors.endFuture, fields: ALL },
    });
  });

  it("returns errors on both dates, with the other date in dd/mm/yyyy format, when the end date is before the start date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "end-date-day": "31", "end-date-month": "3" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: {
        text: "Start date must be the same as or before 31/03/2025",
        fields: ALL,
      },
      endDate: {
        text: "End date must be the same as or after 01/04/2025",
        fields: ALL,
      },
    });
  });

  it("does not compare the range when the start date is invalid", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-day": "" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: "Start date must include a day", fields: ["day"] },
    });
  });

  describe("maximum date range", () => {
    it("accepts a range of exactly the maximum number of days, counting both dates", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-day": "30", "end-date-month": "4" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {});
    });

    it("rejects a range that is one day over the maximum", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-day": "1", "end-date-month": "5" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, tooLong(MAX_DAYS));
    });

    it("uses the maximum of the report being validated", () => {
      const ninetyDaysEnd = {
        "end-date-day": "29",
        "end-date-month": "6",
      };

      assert.deepStrictEqual(
        validator.validateDateRangeReportForm(buildForm(ninetyDaysEnd), 90),
        {},
      );
      assert.deepStrictEqual(
        validator.validateDateRangeReportForm(buildForm(ninetyDaysEnd), 30),
        tooLong(30),
      );
    });

    it("rejects a range that is one day over a 90 day maximum", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-day": "30", "end-date-month": "6" }),
        90,
      );

      assert.deepStrictEqual(errors, tooLong(90));
    });

    it("counts whole days across a clock change", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({
          "start-date-day": "1",
          "start-date-month": "3",
          "start-date-year": "2025",
          "end-date-day": "30",
          "end-date-month": "3",
          "end-date-year": "2025",
        }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {});
    });

    it("does not report the range as too long when the end date is before the start date", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-day": "1", "end-date-year": "2024" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {
        startDate: {
          text: "Start date must be the same as or before 01/04/2024",
          fields: ALL,
        },
        endDate: {
          text: "End date must be the same as or after 01/04/2025",
          fields: ALL,
        },
      });
    });

    it("accepts an end date of today", () => {
      const clock = sinon.useFakeTimers({
        now: Date.UTC(2026, 6, 15, 12, 0, 0),
        toFake: ["Date"],
      });

      try {
        const errors = validator.validateDateRangeReportForm(
          buildForm({
            "start-date-day": "16",
            "start-date-month": "6",
            "start-date-year": "2026",
            "end-date-day": "15",
            "end-date-month": "7",
            "end-date-year": "2026",
          }),
          MAX_DAYS,
        );

        assert.deepStrictEqual(errors, {});
      } finally {
        clock.restore();
      }
    });
  });

  describe("partly filled dates", () => {
    const cases = [
      { name: "day", blank: ["day"], fields: ["day"], parts: "a day" },
      { name: "month", blank: ["month"], fields: ["month"], parts: "a month" },
      { name: "year", blank: ["year"], fields: ["year"], parts: "a year" },
      {
        name: "day and month",
        blank: ["day", "month"],
        fields: ["day", "month"],
        parts: "a day and month",
      },
      {
        name: "day and year",
        blank: ["day", "year"],
        fields: ["day", "year"],
        parts: "a day and year",
      },
      {
        name: "month and year",
        blank: ["month", "year"],
        fields: ["month", "year"],
        parts: "a month and year",
      },
    ];

    for (const { name, blank, fields, parts } of cases) {
      it(`names the missing ${name} for the start date and highlights only that part`, () => {
        const overrides = Object.fromEntries(
          blank.map((part) => [`start-date-${part}`, ""]),
        );

        const errors = validator.validateDateRangeReportForm(
          buildForm(overrides),
          MAX_DAYS,
        );

        assert.deepStrictEqual(errors, {
          startDate: { text: `Start date must include ${parts}`, fields },
        });
      });

      it(`names the missing ${name} for the end date and highlights only that part`, () => {
        const overrides = Object.fromEntries(
          blank.map((part) => [`end-date-${part}`, ""]),
        );

        const errors = validator.validateDateRangeReportForm(
          buildForm(overrides),
          MAX_DAYS,
        );

        assert.deepStrictEqual(errors, {
          endDate: { text: `End date must include ${parts}`, fields },
        });
      });
    }

    it("treats whitespace as a missing part", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-month": "  " }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {
        endDate: { text: "End date must include a month", fields: ["month"] },
      });
    });

    it("reports both dates when each is missing a part", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "start-date-day": "", "end-date-year": "" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {
        startDate: { text: "Start date must include a day", fields: ["day"] },
        endDate: { text: "End date must include a year", fields: ["year"] },
      });
    });
  });

  describe("date format", () => {
    it("rejects a two digit year as not a real date", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-year": "25" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {
        endDate: { text: "End date must be a real date", fields: ALL },
      });
    });

    it("rejects a five digit year as not a real date", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "start-date-year": "20255" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {
        startDate: { text: "Start date must be a real date", fields: ALL },
      });
    });

    it("rejects a day with trailing characters as not a real date", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-day": "1a" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(errors, {
        endDate: { text: "End date must be a real date", fields: ALL },
      });
    });

    it("does not compare the range when either date has its own error", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-month": "", "start-date-year": "2026" }),
        MAX_DAYS,
      );

      assert.deepStrictEqual(Object.keys(errors), ["endDate"]);
    });
  });

  describe("too long range errors", () => {
    it("highlights both dates but only links to the start date in the summary", () => {
      assert.deepStrictEqual(buildDateRangeTooLongErrors(30), {
        startDate: {
          text: "Date range must be between 1 and 30 days",
          fields: ALL,
        },
        endDate: {
          text: "Date range must be between 1 and 30 days",
          fields: ALL,
          inSummary: false,
        },
      });
    });

    it("uses the report's own limit in the message", () => {
      assert.equal(
        buildDateRangeTooLongErrors(90).startDate.text,
        "Date range must be between 1 and 90 days",
      );
    });
  });
});
