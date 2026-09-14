import axios from "axios";
import { classifyApplicationApiHttpFailure } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/applicationApiFailure.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

export function translateReportApiFailure(error: unknown): Error {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    if (
      error instanceof Error &&
      error.message.includes("Missing access token")
    ) {
      return new ApplicationError(
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        "report_download",
        false,
      );
    }

    return new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      "report_download",
      true,
    );
  }

  const failure = classifyApplicationApiHttpFailure(error);
  if (failure.outcome === "NOT_FOUND") {
    return new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
      "report_download",
      false,
    );
  }

  return new ApplicationError(
    failure.type,
    "report_download",
    failure.retryable,
  );
}
