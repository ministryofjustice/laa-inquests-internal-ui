import axios from "axios";
import { classifyApplicationApiHttpFailure } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/applicationApiFailure.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import { UpstreamAuthError } from "#src/ports/common/upstreamAuthError.js";

export function translateReportApiFailure(error: unknown): Error {
  if (error instanceof UpstreamAuthError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    if (
      error instanceof Error &&
      error.message.includes("Missing access token")
    ) {
      return new ApplicationError(
        APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
        "report_download",
        false,
      );
    }

    return new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      "report_download",
      true,
    );
  }

  const failure = classifyApplicationApiHttpFailure(error);
  if (failure.outcome === "NOT_FOUND") {
    return new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_REJECTED,
      "report_download",
      false,
    );
  }

  return new ApplicationError(
    failure.kind,
    "report_download",
    failure.retryable,
  );
}
