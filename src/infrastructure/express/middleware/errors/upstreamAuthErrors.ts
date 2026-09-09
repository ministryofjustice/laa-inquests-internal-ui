import {
  UpstreamAuthError,
  UPSTREAM_AUTH_FAILURES,
  type UpstreamAuthFailure,
} from "#src/ports/common/upstreamAuthError.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

export const getUpstreamAuthFailure = (
  err: unknown,
): UpstreamAuthFailure | undefined => {
  if (err instanceof UpstreamAuthError) {
    return err.failure;
  } else if (
    err instanceof ApplicationError &&
    err.kind === APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED
  ) {
    return UPSTREAM_AUTH_FAILURES.UNAUTHENTICATED;
  } else if (
    err instanceof ApplicationError &&
    err.kind === APPLICATION_ERROR_KINDS.FORBIDDEN
  ) {
    return UPSTREAM_AUTH_FAILURES.FORBIDDEN;
  } else {
    return undefined;
  }
};

export const getUpstreamAuthErrorContext = (
  err: unknown,
): Record<string, unknown> => {
  if (err instanceof UpstreamAuthError) {
    return {
      upstream_route: err.route,
      upstream_method: err.method,
    };
  } else if (err instanceof ApplicationError) {
    return {
      error_kind: err.kind,
      operation: err.operation,
      retryable: err.retryable,
    };
  } else {
    return {};
  }
};
