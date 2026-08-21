import { strict as assert } from "assert";
import { PublicBodySchema } from "#src/adaptors/models/application.schema.js";

describe("PublicBodySchema", () => {
  it("parses a public authority reference data record", () => {
    const publicAuthority = {
      publicBodyId: "Department for Transport",
      publicBodyDescription: "Department for Transport",
    };

    const result = PublicBodySchema.parse(publicAuthority);

    assert.deepEqual(result, publicAuthority);
  });

  it("rejects a record missing publicBodyDescription", () => {
    const publicAuthority = {
      publicBodyId: "Department for Transport",
    };

    assert.throws(() => PublicBodySchema.parse(publicAuthority));
  });
});
