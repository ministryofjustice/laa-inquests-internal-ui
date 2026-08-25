import { assert } from "chai";
import { PublicAuthorityValidator } from "#src/adaptors/presenter/applications/PublicAuthority/PublicAuthority.validator.js";

describe("PublicAuthorityValidator", () => {
  const validator = new PublicAuthorityValidator();

  describe("validatePublicAuthorityInput", () => {
    it("returns no errors when a single public authority is selected", () => {
      const errors = validator.validatePublicAuthorityInput({
        publicAuthorityOption: "Cabinet Office",
      });

      assert.deepEqual(errors, {});
    });

    it("returns no errors when multiple public authorities are selected", () => {
      const errors = validator.validatePublicAuthorityInput({
        publicAuthorityOption: ["Cabinet Office", "Department for Transport"],
      });

      assert.deepEqual(errors, {});
    });

    it("returns an error when no public authority is selected (undefined)", () => {
      const errors = validator.validatePublicAuthorityInput({
        publicAuthorityOption: undefined,
      });

      assert.deepInclude(errors, {
        noPublicAuthoritySelected: {
          text: "Select at least one public authority",
        },
      });
    });

    it("returns an error when no public authority is selected (empty string)", () => {
      const errors = validator.validatePublicAuthorityInput({
        publicAuthorityOption: "",
      });

      assert.deepInclude(errors, {
        noPublicAuthoritySelected: {
          text: "Select at least one public authority",
        },
      });
    });

    it("returns an error when no public authority is selected (empty array)", () => {
      const errors = validator.validatePublicAuthorityInput({
        publicAuthorityOption: [],
      });

      assert.deepInclude(errors, {
        noPublicAuthoritySelected: {
          text: "Select at least one public authority",
        },
      });
    });
  });
});
