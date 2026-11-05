import { strict as assert } from "assert";
import sinon from "sinon";
import { DateRangeReportValidator } from "#src/adaptors/presenter/reports/DateRangeReport/DateRangeReport.validator.js";
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

  const tooLong = (maxDays: number): string =>
    validationErrors.dateRangeTooLong.replace("{maxDays}", String(maxDays));

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
      startDate: { text: validationErrors.startMissing },
      endDate: { text: validationErrors.endMissing },
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
      startDate: { text: validationErrors.startMissing },
    });
  });

  it("returns a start date error when the start date is not a real date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-day": "31", "start-date-month": "2" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startInvalid },
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
      startDate: { text: validationErrors.startInvalid },
    });
  });

  it("returns an end date error when the end date is not a real date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "end-date-day": "31" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      endDate: { text: validationErrors.endInvalid },
    });
  });

  it("returns errors when both dates are in the future", () => {
    const nextYear = String(new Date().getFullYear() + 1);
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-year": nextYear, "end-date-year": nextYear }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startFuture },
      endDate: { text: validationErrors.endFuture },
    });
  });

  it("returns an end date error when the end date is before the start date", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "end-date-day": "31", "end-date-month": "3" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      endDate: { text: validationErrors.endBeforeStart },
    });
  });

  it("does not compare the range when the start date is invalid", () => {
    const errors = validator.validateDateRangeReportForm(
      buildForm({ "start-date-day": "" }),
      MAX_DAYS,
    );

    assert.deepStrictEqual(errors, {
      startDate: { text: validationErrors.startMissing },
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

      assert.deepStrictEqual(errors, {
        endDate: { text: tooLong(MAX_DAYS) },
      });
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
        { endDate: { text: tooLong(30) } },
      );
    });

    it("rejects a range that is one day over a 90 day maximum", () => {
      const errors = validator.validateDateRangeReportForm(
        buildForm({ "end-date-day": "30", "end-date-month": "6" }),
        90,
      );

      assert.deepStrictEqual(errors, { endDate: { text: tooLong(90) } });
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
        endDate: { text: validationErrors.endBeforeStart },
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
});
