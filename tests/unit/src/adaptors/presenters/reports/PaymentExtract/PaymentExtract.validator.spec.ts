import { strict as assert } from "assert";
import { PaymentExtractValidator } from "#src/adaptors/presenter/reports/PaymentExtract/PaymentExtract.validator.js";
import type { PaymentExtractForm } from "#src/adaptors/presenter/reports/PaymentExtract/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const validationErrors = en.pages.reports.paymentExtract.validationErrors;

describe("PaymentExtractValidator", () => {
  let validator: PaymentExtractValidator;

  const buildForm = (
    overrides: Partial<PaymentExtractForm> = {},
  ): PaymentExtractForm => ({
    "from-date-day": "1",
    "from-date-month": "4",
    "from-date-year": "2025",
    "to-date-day": "30",
    "to-date-month": "4",
    "to-date-year": "2025",
    ...overrides,
  });

  beforeEach(() => {
    validator = new PaymentExtractValidator();
  });

  it("returns errors for both dates when nothing is entered", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({
        "from-date-day": "",
        "from-date-month": "",
        "from-date-year": "",
        "to-date-day": "",
        "to-date-month": "",
        "to-date-year": "",
      }),
    );

    assert.deepStrictEqual(errors, {
      fromDate: { text: validationErrors.fromMissing },
      toDate: { text: validationErrors.toMissing },
    });
  });

  it("returns an end date error when the end date is before the start date", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "to-date-day": "31", "to-date-month": "3" }),
    );

    assert.deepStrictEqual(errors, {
      toDate: { text: validationErrors.toBeforeFrom },
    });
  });

  it("returns no errors when the date range is valid", () => {
    assert.deepStrictEqual(
      validator.validatePaymentExtractForm(buildForm()),
      {},
    );
  });

  it("returns no errors when the end date equals the start date", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "to-date-day": "1" }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns no errors when the date fields have surrounding whitespace", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "from-date-day": " 1 ", "to-date-year": " 2025 " }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns a start date missing error when the start date fields contain only spaces", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({
        "from-date-day": " ",
        "from-date-month": " ",
        "from-date-year": " ",
      }),
    );

    assert.deepStrictEqual(errors, {
      fromDate: { text: validationErrors.fromMissing },
    });
  });

  it("returns a start date error when the start date is not a real date", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "from-date-day": "31", "from-date-month": "2" }),
    );

    assert.deepStrictEqual(errors, {
      fromDate: { text: validationErrors.fromInvalid },
    });
  });

  it("returns a start date error when the start date is not numeric", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({
        "from-date-day": "a",
        "from-date-month": "b",
        "from-date-year": "c",
      }),
    );

    assert.deepStrictEqual(errors, {
      fromDate: { text: validationErrors.fromInvalid },
    });
  });

  it("returns errors when both dates are in the future", () => {
    const nextYear = String(new Date().getFullYear() + 1);
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "from-date-year": nextYear, "to-date-year": nextYear }),
    );

    assert.deepStrictEqual(errors, {
      fromDate: { text: validationErrors.fromFuture },
      toDate: { text: validationErrors.toFuture },
    });
  });

  it("returns an end date error when the end date is not a real date", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "to-date-day": "31" }),
    );

    assert.deepStrictEqual(errors, {
      toDate: { text: validationErrors.toInvalid },
    });
  });

  it("does not compare the range when the start date is invalid", () => {
    const errors = validator.validatePaymentExtractForm(
      buildForm({ "from-date-day": "" }),
    );

    assert.deepStrictEqual(errors, {
      fromDate: { text: validationErrors.fromMissing },
    });
  });
});
