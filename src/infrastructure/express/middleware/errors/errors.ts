import type { NextFunction, Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import {HTTP_INTERNAL_SERVER_ERROR, HTTP_NOT_FOUND} from "#src/infrastructure/express/constants.js";

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
    message: "Page not found",
  });
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
    },
  });
  res.render("main/error", {
    status: HTTP_INTERNAL_SERVER_ERROR,
    message: "Internal Server Error",
  });
};

export { handleRouteNotFound, handleServerErrors };
