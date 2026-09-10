import { AxiosError } from "axios";
import {
  APPLICATION_ERROR_TYPES,
  type ApplicationErrorType,
} from "#src/use-cases/common/applicationError.js";

export type ClaimsApiHttpFailure =
  | { outcome: "NOT_FOUND"; status: number }
  | {
      outcome: "ERROR";
      type: ApplicationErrorType;
      failureReason: string;
      retryable: boolean;
      status?: number;
    };

export function classifyClaimsApiHttpFailure(
  error: AxiosError,
): ClaimsApiHttpFailure {
  const { code, response } = error;
  const { status } = response ?? {};
  if (status === 404) return { outcome: "NOT_FOUND", status };
  if (status === 401) {
    return {
      outcome: "ERROR",
      type: APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      failureReason: "unauthenticated",
      retryable: false,
      status,
    };
  }
  if (status === 403) {
    return {
      outcome: "ERROR",
      type: APPLICATION_ERROR_TYPES.FORBIDDEN,
      failureReason: "forbidden",
      retryable: false,
      status,
    };
  }
  if (status !== undefined && status >= 500) {
    return {
      outcome: "ERROR",
      type: APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      failureReason: "upstream_5xx",
      retryable: true,
      status,
    };
  }
  if (response === undefined) {
    return {
      outcome: "ERROR",
      type: APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      failureReason:
        code === AxiosError.ECONNABORTED || code === AxiosError.ETIMEDOUT
          ? "timeout"
          : "network",
      retryable: true,
    };
  }
  return {
    outcome: "ERROR",
    type: APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
    failureReason: "upstream_4xx",
    retryable: false,
    status,
  };
}

export function getClaimsUpstreamStatusContext(
  status: number | undefined,
): Record<string, number> {
  return status === undefined ? {} : { upstream_status_code: status };
}
