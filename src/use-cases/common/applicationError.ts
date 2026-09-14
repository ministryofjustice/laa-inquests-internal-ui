export const APPLICATION_ERROR_TYPES = {
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  UPSTREAM_REJECTED: "UPSTREAM_REJECTED",
  INVALID_UPSTREAM_RESPONSE: "INVALID_UPSTREAM_RESPONSE",
} as const;

export type ApplicationErrorType =
  (typeof APPLICATION_ERROR_TYPES)[keyof typeof APPLICATION_ERROR_TYPES];

export class ApplicationError extends Error {
  constructor(
    readonly type: ApplicationErrorType,
    readonly operation: string,
    readonly retryable: boolean,
  ) {
    super(`Application operation failed: ${operation}`);
    this.name = "ApplicationError";
  }
}
