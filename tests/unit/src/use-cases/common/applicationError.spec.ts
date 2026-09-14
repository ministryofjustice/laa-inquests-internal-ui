import { strict as assert } from "assert";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

describe("ApplicationError", () => {
  it("contains only stable application failure metadata", () => {
    const error = new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "get_certificate",
      true,
    );

    assert.equal(error.name, "ApplicationError");
    assert.equal(error.type, APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE);
    assert.equal(error.operation, "get_certificate");
    assert.equal(error.retryable, true);
    assert.equal(error.cause, undefined);
  });
});
