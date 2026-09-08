import { strict as assert } from "assert";
import { ConfirmProfitCostsValidator } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/ConfirmProfitCosts.validator.js";
import type { ConfirmProfitCostsForm } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const validationErrors =
  en.pages.claimAssessment.confirmProfitCosts.validationErrors;

describe("ConfirmProfitCostsValidator", () => {
  let validator: ConfirmProfitCostsValidator;

  const buildForm = (
    overrides: Partial<ConfirmProfitCostsForm> = {},
  ): ConfirmProfitCostsForm => ({
    "net-total": "",
    "gross-total": "",
    "zero-vat-total": "",
    ...overrides,
  });

  beforeEach(() => {
    validator = new ConfirmProfitCostsValidator();
  });

  it("returns no errors when the net and gross totals are valid", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "net-total": "300", "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns no errors when only the zero VAT total is valid", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "zero-vat-total": "0" }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns a field error when the net total is not a valid number", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "net-total": "abc", "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {
      netTotal: { text: validationErrors.netFormat },
    });
  });

  it("returns a field error when the gross total has 3 or more decimal places", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "net-total": "300", "gross-total": "360.123" }),
    );

    assert.deepStrictEqual(errors, {
      grossTotal: { text: validationErrors.grossFormat },
    });
  });

  it("returns a field error when the zero VAT total is not a valid number", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "zero-vat-total": "300.999" }),
    );

    assert.deepStrictEqual(errors, {
      zeroVatTotal: { text: validationErrors.zeroVatFormat },
    });
  });

  it("returns a summary-only error when all 3 totals are empty", () => {
    const errors = validator.validateConfirmProfitCostsForm(buildForm());

    assert.deepStrictEqual(errors, {
      totalRequired: { text: validationErrors.totalRequired },
    });
  });

  it("returns an error on the net total when only the gross total is filled in", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {
      netTotal: { text: validationErrors.netMissing },
    });
  });

  it("returns an error on the gross total when only the net total is filled in", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "net-total": "300" }),
    );

    assert.deepStrictEqual(errors, {
      grossTotal: { text: validationErrors.grossMissing },
    });
  });

  it("returns a conflict error on all 3 fields when 0% and 20% VAT totals are both filled in", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({
        "net-total": "300",
        "gross-total": "360",
        "zero-vat-total": "100",
      }),
    );

    assert.deepStrictEqual(errors, {
      netTotal: { text: validationErrors.vatConflict },
      grossTotal: { text: validationErrors.vatConflict },
      zeroVatTotal: { text: validationErrors.vatConflict },
    });
  });

  it("returns an error on the gross total when the net total is greater than the gross total", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "net-total": "400", "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {
      grossTotal: { text: validationErrors.grossLessThanNet },
    });
  });

  it("treats a value of 0 as filled in", () => {
    const errors = validator.validateConfirmProfitCostsForm(
      buildForm({ "net-total": "0", "gross-total": "0" }),
    );

    assert.deepStrictEqual(errors, {});
  });
});
