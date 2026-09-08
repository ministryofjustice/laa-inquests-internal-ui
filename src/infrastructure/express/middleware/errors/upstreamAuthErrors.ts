import {
  UpstreamAuthError,
  type UpstreamAuthFailure,
} from "#src/ports/common/upstreamAuthError.js";

export const getUpstreamAuthFailure = (
  err: unknown,
): UpstreamAuthFailure | undefined =>
  err instanceof UpstreamAuthError ? err.failure : undefined;

export const getUpstreamAuthErrorContext = (
  err: unknown,
): Record<string, unknown> => {
  if (!(err instanceof UpstreamAuthError)) {
    return {};
  }

  return {
    upstream_route: err.route,
    upstream_method: err.method,
  };
};
