import { SearchApplicationValidator } from "#src/adaptors/presenter/applications/SearchApplication.validator.js";
import { assert } from "chai";

describe("SearchApplicationValidator", () => {
  describe("validateSearchApplicationForm", () => {
    it("returns no errors on happy path", () => {
      const validator = new SearchApplicationValidator();
      const errors = validator.validateSearchApplicationForm("INQ-YYY-YYY");
      assert.deepEqual(errors, {});
    });

    it("returns error on null application reference", () => {
      const validator = new SearchApplicationValidator();
      const errors = validator.validateSearchApplicationForm(null);
      const expected = {
        applicationReference: {
          text: "Enter a legal aid reference",
        },
      };
      assert.deepInclude(errors, expected);
    });

    it("returns error on empty application reference", () => {
      const validator = new SearchApplicationValidator();
      const errors = validator.validateSearchApplicationForm("");
      const expected = {
        applicationReference: {
          text: "Enter a legal aid reference",
        },
      };
      assert.deepInclude(errors, expected);
    });

    const invalidReferences = ["INQ-YYYY-YYY", "INQ-YYY-YYYY", "Reference"];

    invalidReferences.forEach((reference) => {
      it("returns error on incorrect format", () => {
        const validator = new SearchApplicationValidator();
        const errors = validator.validateSearchApplicationForm(reference);
        const expected = {
          applicationReference: {
            text: "Enter a legal aid reference number in the correct format",
          },
        };
        assert.deepInclude(errors, expected);
      });
    });
  });
});
