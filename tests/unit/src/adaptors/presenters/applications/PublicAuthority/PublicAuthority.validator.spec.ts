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

    it("returns an error when the selection is unchanged from the current public bodies", () => {
      const currentPublicBodyIds = [
        "Cabinet Office",
        "Department for Transport",
      ];
      const errors = validator.validatePublicAuthorityInput(
        {
          publicAuthorityOption: ["Cabinet Office", "Department for Transport"],
        },
        currentPublicBodyIds,
      );

      assert.deepInclude(errors, {
        noChangeToPublicAuthorities: {
          text: "You have not made any changes to the interested parties",
        },
      });
    });

    it("returns an error when the selection is unchanged regardless of order", () => {
      const currentPublicBodyIds = [
        "Department for Transport",
        "Cabinet Office",
      ];
      const errors = validator.validatePublicAuthorityInput(
        {
          publicAuthorityOption: ["Cabinet Office", "Department for Transport"],
        },
        currentPublicBodyIds,
      );

      assert.deepInclude(errors, {
        noChangeToPublicAuthorities: {
          text: "You have not made any changes to the interested parties",
        },
      });
    });

    it("returns no errors when the selection differs from the current public bodies", () => {
      const currentPublicBodyIds = ["Cabinet Office"];
      const errors = validator.validatePublicAuthorityInput(
        {
          publicAuthorityOption: ["Cabinet Office", "Department for Transport"],
        },
        currentPublicBodyIds,
      );

      assert.deepEqual(errors, {});
    });

    it("returns no errors when a single selection differs from current public bodies", () => {
      const currentPublicBodyIds = ["Cabinet Office"];
      const errors = validator.validatePublicAuthorityInput(
        { publicAuthorityOption: "Department for Transport" },
        currentPublicBodyIds,
      );

      assert.deepEqual(errors, {});
    });
  });
});
