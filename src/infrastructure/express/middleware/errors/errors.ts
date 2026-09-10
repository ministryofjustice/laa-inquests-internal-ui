import type { NextFunction, Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { t } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import {
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from "#src/infrastructure/express/constants.js";
import { SESSION_EXPIRED_QUERY_FLAG } from "#src/infrastructure/locales/constants.js";

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
    res.status(HTTP_FORBIDDEN).render("main/error", {
      status: HTTP_FORBIDDEN,
      error: t("pages.error.forbidden"),
    });
  } else if (
    failure === APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED &&
    req.query[SESSION_EXPIRED_QUERY_FLAG] === undefined
  ) {
    logAuthFailure("auth_session_expired", HTTP_UNAUTHORIZED);
    // Destroying the session is best effort; the credentials are stale either way.
    req.session.destroy(() => {
      res.redirect(`/auth/login?${SESSION_EXPIRED_QUERY_FLAG}=true`);
    });
  } else {
    next(err);
  }
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

export { handleApiAuthErrors, handleRouteNotFound, handleServerErrors };
