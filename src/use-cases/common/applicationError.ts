export const APPLICATION_ERROR_KINDS = {
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  UPSTREAM_REJECTED: "UPSTREAM_REJECTED",
  INVALID_UPSTREAM_RESPONSE: "INVALID_UPSTREAM_RESPONSE",
} as const;

export type ApplicationErrorKind =
  (typeof APPLICATION_ERROR_KINDS)[keyof typeof APPLICATION_ERROR_KINDS];

export class ApplicationError extends Error {
  constructor(
    readonly kind: ApplicationErrorKind,
    readonly operation: string,
    readonly retryable: boolean,
  ) {
    super(`Application operation failed: ${operation}`);
    this.name = "ApplicationError";
  }
}
