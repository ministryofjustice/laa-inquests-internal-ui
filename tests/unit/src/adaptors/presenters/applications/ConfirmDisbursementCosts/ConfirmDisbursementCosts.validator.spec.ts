import { assert } from "chai";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { ConfirmDisbursementCostsValidator } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.validator.js";
import type { DisbursementCostsForm } from "#src/adaptors/presenter/models/form.types.js";

describe("ConfirmDisbursementCostsValidator", () => {
  const validator = new ConfirmDisbursementCostsValidator();
  const validationErrors = en.pages.disbursementCosts.validationErrors;

  function buildForm(
    overrides: Partial<DisbursementCostsForm> = {},
  ): DisbursementCostsForm {
    return {
      "disbursement-cost-vat-zero": "100",
      "disbursement-cost-net": "200.50",
      "disbursement-cost-gross": "240.60",
      ...overrides,
    };
  }

  describe("validateDisbursementCostsForm", () => {
    it("returns no errors when all costs are valid", () => {
      const errors = validator.validateDisbursementCostsForm(buildForm());

      assert.deepEqual(errors, {});
    });

    it("adds a notEmpty error for each empty cost field", () => {
      const errors = validator.validateDisbursementCostsForm({
        "disbursement-cost-vat-zero": "",
        "disbursement-cost-net": "",
        "disbursement-cost-gross": "",
      });

      assert.deepEqual(errors, {
        disbursementCostVatZero: { text: validationErrors.vatZero.notEmpty },
        disbursementCostNet: { text: validationErrors.net.notEmpty },
        disbursementCostGross: { text: validationErrors.gross.notEmpty },
      });
    });

    it("adds a notEmpty error when a value is only whitespace", () => {
      const errors = validator.validateDisbursementCostsForm(
        buildForm({ "disbursement-cost-net": "   " }),
      );

      assert.deepInclude(errors, {
        disbursementCostNet: { text: validationErrors.net.notEmpty },
      });
    });

    it("adds an invalid error for a non-numeric value", () => {
      const errors = validator.validateDisbursementCostsForm(
        buildForm({ "disbursement-cost-vat-zero": "abc" }),
      );

      assert.deepInclude(errors, {
        disbursementCostVatZero: { text: validationErrors.vatZero.invalid },
      });
    });

    it("adds an invalid error for more than two decimal places", () => {
      const errors = validator.validateDisbursementCostsForm(
        buildForm({ "disbursement-cost-gross": "120.555" }),
      );

      assert.deepInclude(errors, {
        disbursementCostGross: { text: validationErrors.gross.invalid },
      });
    });

    it("adds a negative error for a negative value", () => {
      const errors = validator.validateDisbursementCostsForm(
        buildForm({ "disbursement-cost-net": "-50" }),
      );

      assert.deepInclude(errors, {
        disbursementCostNet: { text: validationErrors.net.negative },
      });
    });

    it("accepts values with thousands separators", () => {
      const errors = validator.validateDisbursementCostsForm(
        buildForm({ "disbursement-cost-gross": "1,200.00" }),
      );

      assert.notProperty(errors, "disbursementCostGross");
    });
  });
});
