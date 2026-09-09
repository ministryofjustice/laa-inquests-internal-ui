import { strict as assert } from "assert";
import {
  getUpstreamAuthErrorContext,
  getUpstreamAuthFailure,
} from "#src/infrastructure/express/middleware/errors/upstreamAuthErrors.js";
import {
  UPSTREAM_AUTH_FAILURES,
  UpstreamAuthError,
} from "#src/ports/common/upstreamAuthError.js";

const ROUTE = "/applications/INQ-YYY-001";
const METHOD = "GET";

const buildAuthError = (): UpstreamAuthError =>
  new UpstreamAuthError(UPSTREAM_AUTH_FAILURES.FORBIDDEN, ROUTE, METHOD, {
    cause: new Error("original"),
  });

describe("upstream auth error classifier", () => {
  describe("getUpstreamAuthFailure", () => {
    it("returns the failure for an upstream auth error", () => {
      assert.equal(
        getUpstreamAuthFailure(buildAuthError()),
        UPSTREAM_AUTH_FAILURES.FORBIDDEN,
      );
    });

    it("returns undefined for any other error", () => {
      assert.equal(getUpstreamAuthFailure(new Error("boom")), undefined);
      assert.equal(getUpstreamAuthFailure(undefined), undefined);
      assert.equal(getUpstreamAuthFailure(null), undefined);
      assert.equal(getUpstreamAuthFailure("forbidden"), undefined);
    });
  });

  describe("getUpstreamAuthErrorContext", () => {
    it("returns the upstream request metadata for logging", () => {
      assert.deepEqual(getUpstreamAuthErrorContext(buildAuthError()), {
        upstream_route: ROUTE,
        upstream_method: METHOD,
      });
    });

    it("returns no context for any other error", () => {
      assert.deepEqual(getUpstreamAuthErrorContext(new Error("boom")), {});
    });
  });
});
