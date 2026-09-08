import { strict as assert } from "assert";
import { ConfirmDisbursementCostsValidator } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.validator.js";
import type { ConfirmDisbursementCostsForm } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/models/form.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const validationErrors =
  en.pages.claimAssessment.confirmDisbursementCosts.validationErrors;

describe("ConfirmDisbursementCostsValidator", () => {
  let validator: ConfirmDisbursementCostsValidator;

  const buildForm = (
    overrides: Partial<ConfirmDisbursementCostsForm> = {},
  ): ConfirmDisbursementCostsForm => ({
    "net-total": "",
    "gross-total": "",
    "zero-vat-total": "",
    ...overrides,
  });

  beforeEach(() => {
    validator = new ConfirmDisbursementCostsValidator();
  });

  it("returns no errors when the net and gross totals are valid", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "net-total": "300", "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns no errors when only the zero VAT total is valid", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "zero-vat-total": "100" }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns no errors when 0% VAT, net and gross totals are all provided", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({
        "net-total": "300",
        "gross-total": "360",
        "zero-vat-total": "100",
      }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("returns a field error when the net total is not a valid number", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "net-total": "abc", "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {
      netTotal: { text: validationErrors.netFormat },
    });
  });

  it("returns a field error when the gross total has 3 or more decimal places", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "net-total": "300", "gross-total": "360.123" }),
    );

    assert.deepStrictEqual(errors, {
      grossTotal: { text: validationErrors.grossFormat },
    });
  });

  it("returns a field error when the zero VAT total is not a valid number", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "zero-vat-total": "300.999" }),
    );

    assert.deepStrictEqual(errors, {
      zeroVatTotal: { text: validationErrors.zeroVatFormat },
    });
  });

  it("returns a summary-only error when all 3 totals are empty", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(buildForm());

    assert.deepStrictEqual(errors, {
      totalRequired: { text: validationErrors.totalRequired },
    });
  });

  it("returns an error on the net total when only the gross total is filled in", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {
      netTotal: { text: validationErrors.netMissing },
    });
  });

  it("returns an error on the gross total when only the net total is filled in", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "net-total": "300" }),
    );

    assert.deepStrictEqual(errors, {
      grossTotal: { text: validationErrors.grossMissing },
    });
  });

  it("returns an error on the gross total when gross is not more than net and the 0% VAT total is blank", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "net-total": "400", "gross-total": "360" }),
    );

    assert.deepStrictEqual(errors, {
      grossTotal: { text: validationErrors.grossNotGreaterThanNet },
    });
  });

  it("does not compare gross against net when the 0% VAT total is provided", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({
        "net-total": "400",
        "gross-total": "360",
        "zero-vat-total": "100",
      }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("allows a nil bill where the net and gross totals are both 0", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "net-total": "0", "gross-total": "0" }),
    );

    assert.deepStrictEqual(errors, {});
  });

  it("treats a value of 0 as filled in", () => {
    const errors = validator.validateConfirmDisbursementCostsForm(
      buildForm({ "zero-vat-total": "0" }),
    );

    assert.deepStrictEqual(errors, {});
  });
});
