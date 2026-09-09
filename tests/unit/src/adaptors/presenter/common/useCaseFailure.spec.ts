import { strict as assert } from "assert";
import { throwUseCaseFailure } from "#src/adaptors/presenter/common/useCaseFailure.js";
import {
  UPSTREAM_AUTH_FAILURES,
  UpstreamAuthError,
} from "#src/ports/common/upstreamAuthError.js";
import { TECHNICAL_FAILURE_REASONS } from "#src/use-cases/common/useCaseResult.types.js";

describe("throwUseCaseFailure", () => {
  it("rethrows an upstream auth failure untouched", () => {
    const authError = new UpstreamAuthError(
      UPSTREAM_AUTH_FAILURES.UNAUTHENTICATED,
      "/applications/INQ-YYY-001",
      "GET",
    );

    assert.throws(
      () =>
        throwUseCaseFailure(
          {
            status: "TECHNICAL_FAILURE",
            reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
            cause: authError,
          },
          "Unable to build application overview view",
        ),
      (thrown: unknown) => thrown === authError,
    );
  });

  it("wraps other technical failures while keeping the cause", () => {
    const cause = new Error("upstream exploded");

    assert.throws(
      () =>
        throwUseCaseFailure(
          {
            status: "TECHNICAL_FAILURE",
            reason: TECHNICAL_FAILURE_REASONS.UPSTREAM_REJECTED,
            cause,
          },
          "Unable to build application overview view",
        ),
      (thrown: unknown) =>
        thrown instanceof Error &&
        thrown.message === "Unable to build application overview view" &&
        thrown.cause === cause,
    );
  });

  it("throws without a cause for validation failures", () => {
    assert.throws(
      () =>
        throwUseCaseFailure(
          { status: "VALIDATION_FAILED", validationErrors: {} },
          "Unable to prepare decision form",
        ),
      (thrown: unknown) =>
        thrown instanceof Error &&
        thrown.message === "Unable to prepare decision form" &&
        thrown.cause === undefined,
    );
  });
});
