import type { NextFunction, Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { t } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
  type ApplicationErrorType,
} from "#src/use-cases/common/applicationError.js";
import {
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from "#src/infrastructure/express/constants.js";
import {
  SESSION_EXPIRED_QUERY_FLAG,
  SESSION_TERMINATION_REASONS,
} from "#src/infrastructure/locales/constants.js";
import { findReportByDownloadPath } from "#src/adaptors/presenter/reports/reportDefinitions.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";
import { logSessionTerminated } from "#src/infrastructure/express/session/sessionAudit.js";

const getRequestRoutePath = (req: Request): string => {
  const route = req.route as { path?: unknown } | undefined;
  if (route !== undefined && typeof route.path === "string") {
    return route.path;
  }

  return req.path;
};

const handleRouteNotFound = (req: Request, res: Response): void => {
  logger.logWarn({
    functionName: "route_not_found_middleware",
    message: "Route not found",
    request: req,
    extraContext: {
      event: "route_not_found",
      route: getRequestRoutePath(req),
      method: req.method,
      status_code: HTTP_NOT_FOUND,
    },
  });

  res.status(HTTP_NOT_FOUND).render("main/error", {
    status: HTTP_NOT_FOUND,
    error: t("pages.error.pageNotFound"),
  });
};

const handleApiAuthErrors = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const failure = err instanceof ApplicationError ? err.type : undefined;

  const logAuthFailure = (event: string, statusCode: number): void => {
    logger.logWarn({
      functionName: "api_auth_error_middleware",
      message: "Inquests API rejected the request",
      request: req,
      extraContext: {
        event,
        route: getRequestRoutePath(req),
        method: req.method,
        status_code: statusCode,
        ...(err instanceof ApplicationError
          ? {
              error_type: err.type,
              operation: err.operation,
              retryable: err.retryable,
            }
          : {}),
      },
    });
  };

  if (failure === APPLICATION_ERROR_TYPES.FORBIDDEN) {
    logAuthFailure("api_forbidden", HTTP_FORBIDDEN);
    res.status(HTTP_FORBIDDEN).render("main/error-unauthorised");
  } else if (
    failure === APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED &&
    req.query[SESSION_EXPIRED_QUERY_FLAG] === undefined
  ) {
    logAuthFailure("auth_session_expired", HTTP_UNAUTHORIZED);
    logSessionTerminated(
      req,
      "api_auth_error_middleware",
      hashSessionId(req.sessionID),
      SESSION_TERMINATION_REASONS.CREDENTIAL_REJECTED,
    );
    // Destroying the session is best effort; the credentials are stale either way.
    req.session.destroy(() => {
      res.redirect(`/auth/login?${SESSION_EXPIRED_QUERY_FLAG}=true`);
    });
  } else {
    next(err);
  }
};

const handleApplicationNotFoundError = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (
    err instanceof ApplicationError &&
    err.type === APPLICATION_ERROR_TYPES.NOT_FOUND
  ) {
    logger.logError({
      functionName: "application_not_found_middleware",
      message: "Application not found",
      err,
      request: req,
      extraContext: {
        event: "application_not_found",
        route: getRequestRoutePath(req),
        method: req.method,
        status_code: HTTP_NOT_FOUND,
      },
    });

    res.status(HTTP_NOT_FOUND);
    res.render("application/not-found");
  } else {
    next(err);
  }
};

const REPORT_FAILURE_ERROR_TYPES: readonly ApplicationErrorType[] = [
  APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
  APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
  APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
];

const DATE_RANGE_QUERY_FIELDS = [
  "start-date-day",
  "start-date-month",
  "start-date-year",
  "end-date-day",
  "end-date-month",
  "end-date-year",
] as const;

// Only the date fields are carried back, so the link never reflects arbitrary query input.
const buildDateRangeBackUrl = ({ query }: Request, slug: string): string => {
  const params = new URLSearchParams();
  for (const field of DATE_RANGE_QUERY_FIELDS) {
    const { [field]: value } = query;
    if (typeof value === "string") {
      params.set(field, value);
    }
  }
  const queryString = params.toString();
  return queryString === ""
    ? `/reports/${slug}`
    : `/reports/${slug}?${queryString}`;
};

const handleReportDownloadError = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const target = findReportByDownloadPath(req.path);

  if (
    !(err instanceof ApplicationError) ||
    !REPORT_FAILURE_ERROR_TYPES.includes(err.type) ||
    target === undefined
  ) {
    next(err);
    return;
  }

  logger.logError({
    functionName: "report_download_error_middleware",
    message: "Report download failed",
    err,
    request: req,
    extraContext: {
      event: "http_request_failed",
      route: getRequestRoutePath(req),
      method: req.method,
      status_code: HTTP_INTERNAL_SERVER_ERROR,
      error_type: err.type,
      operation: err.operation,
      retryable: err.retryable,
    },
  });

  const viewModel =
    target.kind === "dateRange"
      ? {
          isDateRange: true,
          reportName: t(
            `pages.reports.dateRange.${target.report.key}.heading`,
          ).toLowerCase(),
          backUrl: buildDateRangeBackUrl(req, target.report.slug),
        }
      : {
          isDateRange: false,
          reportName: t(target.report.nameKey),
          backUrl: "/reports",
        };

  res.status(HTTP_INTERNAL_SERVER_ERROR);
  res.render("reports/download-error", viewModel);
};

const handleServerErrors = (
  err: unknown,
  req: Request,
  res: Response,
  _: NextFunction,
): void => {
  logger.logError({
    functionName: "server_error_middleware",
    message: "Internal Server Error",
    err,
    request: req,
    extraContext: {
      event: "http_request_failed",
      route: getRequestRoutePath(req),
      method: req.method,
      status_code: HTTP_INTERNAL_SERVER_ERROR,
      ...(err instanceof ApplicationError
        ? {
            error_type: err.type,
            operation: err.operation,
            retryable: err.retryable,
          }
        : {}),
    },
  });
  res.status(HTTP_INTERNAL_SERVER_ERROR);
  res.render("main/error", {
    status: HTTP_INTERNAL_SERVER_ERROR,
    error: t("pages.error.internalServerError"),
  });
};

export {
  handleApiAuthErrors,
  handleRouteNotFound,
  handleServerErrors,
  handleApplicationNotFoundError,
  handleReportDownloadError,
};
