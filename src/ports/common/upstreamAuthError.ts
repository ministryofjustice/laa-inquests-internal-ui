export const UPSTREAM_AUTH_FAILURES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type UpstreamAuthFailure =
  (typeof UPSTREAM_AUTH_FAILURES)[keyof typeof UPSTREAM_AUTH_FAILURES];

// Transport-agnostic translation of an upstream auth rejection, so HTTP client
// types never escape the adaptor layer.
export class UpstreamAuthError extends Error {
  constructor(
    readonly failure: UpstreamAuthFailure,
    readonly route: string,
    readonly method: string,
    options?: ErrorOptions,
  ) {
    super(`Upstream rejected the request: ${failure}`, options);
    this.name = "UpstreamAuthError";
  }
}
