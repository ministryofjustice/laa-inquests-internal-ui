import { AxiosError } from "axios";
import {
  APPLICATION_ERROR_KINDS,
  type ApplicationErrorKind,
} from "#src/use-cases/common/applicationError.js";

export type ApplicationApiHttpFailure =
  | { outcome: "NOT_FOUND"; status: number }
  | {
      outcome: "ERROR";
      kind: ApplicationErrorKind;
      failureKind: string;
      retryable: boolean;
      status?: number;
    };

export function classifyApplicationApiHttpFailure(
  error: AxiosError,
): ApplicationApiHttpFailure {
  const { code, response } = error;
  const { status } = response ?? {};

  if (status === 404) {
    return { outcome: "NOT_FOUND", status };
  } else if (status === 401) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
      failureKind: "unauthenticated",
      retryable: false,
      status,
    };
  } else if (status === 403) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.FORBIDDEN,
      failureKind: "forbidden",
      retryable: false,
      status,
    };
  } else if (status !== undefined && status >= 500) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      failureKind: "upstream_5xx",
      retryable: true,
      status,
    };
  } else if (response === undefined) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      failureKind:
        code === AxiosError.ECONNABORTED || code === AxiosError.ETIMEDOUT
          ? "timeout"
          : "network",
      retryable: true,
    };
  } else {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.UPSTREAM_REJECTED,
      failureKind: "upstream_4xx",
      retryable: false,
      status,
    };
  }
}

export function getUpstreamStatusContext(
  status: number | undefined,
): Record<string, number> {
  if (status === undefined) {
    return {};
  } else {
    return { upstream_status_code: status };
  }
}

export function asUnexpectedApplicationApiFailure(
  failure: ApplicationApiHttpFailure,
): Exclude<ApplicationApiHttpFailure, { outcome: "NOT_FOUND" }> {
  if (failure.outcome === "NOT_FOUND") {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_KINDS.UPSTREAM_REJECTED,
      failureKind: "upstream_4xx",
      retryable: false,
      status: failure.status,
    };
  } else {
    return failure;
  }
}
