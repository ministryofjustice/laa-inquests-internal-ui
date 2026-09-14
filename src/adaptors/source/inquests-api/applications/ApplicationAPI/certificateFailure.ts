import { AxiosError } from "axios";
import {
  APPLICATION_ERROR_TYPES,
  type ApplicationErrorType,
} from "#src/use-cases/common/applicationError.js";

export const GET_CERTIFICATE_OPERATION = "get_certificate";
export const GET_CERTIFICATE_METHOD = "GET";
export const GET_CERTIFICATE_ROUTE = "/applications/:id/certificate";

export type CertificateHttpFailure =
  | { outcome: "NOT_FOUND"; status: number }
  | {
      outcome: "ERROR";
      kind: ApplicationErrorType;
      failureReason: string;
      retryable: boolean;
      status?: number;
    };

export function classifyCertificateHttpFailure(
  error: AxiosError,
): CertificateHttpFailure {
  const { code, response } = error;
  const { status } = response ?? {};

  if (status === 404) {
    return { outcome: "NOT_FOUND", status };
  } else if (status === 401) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      failureReason: "unauthenticated",
      retryable: false,
      status,
    };
  } else if (status === 403) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_TYPES.FORBIDDEN,
      failureReason: "forbidden",
      retryable: false,
      status,
    };
  } else if (status !== undefined && status >= 500) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      failureReason: "upstream_5xx",
      retryable: true,
      status,
    };
  } else if (response === undefined) {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      failureReason:
        code === AxiosError.ECONNABORTED || code === AxiosError.ETIMEDOUT
          ? "timeout"
          : "network",
      retryable: true,
    };
  } else {
    return {
      outcome: "ERROR",
      kind: APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
      failureReason: "upstream_4xx",
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
