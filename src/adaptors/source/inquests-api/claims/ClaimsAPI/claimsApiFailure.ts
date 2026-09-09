import { AxiosError } from "axios";
import {
  APPLICATION_ERROR_KINDS,
  type ApplicationErrorKind,
} from "#src/use-cases/common/applicationError.js";

export type ClaimsApiHttpFailure =
  | { outcome: "NOT_FOUND"; status: number }
  | {
      outcome: "ERROR";
      kind: ApplicationErrorKind;
      failureKind: string;
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
      kind: APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
      failureKind: "unauthenticated",
      retryable: false,
      status,
    };
  }
  if (status === 403) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.FORBIDDEN,
      failureKind: "forbidden",
      retryable: false,
      status,
    };
  }
  if (status !== undefined && status >= 500) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      failureKind: "upstream_5xx",
      retryable: true,
      status,
    };
  }
  if (response === undefined) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      failureKind:
        code === AxiosError.ECONNABORTED || code === AxiosError.ETIMEDOUT
          ? "timeout"
          : "network",
      retryable: true,
    };
  }
  return {
    outcome: "ERROR",
    kind: APPLICATION_ERROR_KINDS.UPSTREAM_REJECTED,
    failureKind: "upstream_4xx",
    retryable: false,
    status,
  };
}

export function getClaimsUpstreamStatusContext(
  status: number | undefined,
): Record<string, number> {
  return status === undefined ? {} : { upstream_status_code: status };
}
