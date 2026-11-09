import type { IRoute, RequestHandler } from "express";
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_UNAUTHORIZED,
  HTTP_UNPROCESSABLE_ENTITY,
} from "#src/infrastructure/express/errorConstants.js";

const ERROR_STATUS_CODES = new Set([
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_UNPROCESSABLE_ENTITY,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_INTERNAL_SERVER_ERROR,
]);

export const captureAnalyticsBasePath: RequestHandler = (req, res, next) => {
  const { baseUrl } = req;
  res.locals.analyticsBasePath = baseUrl;
  next();
};

export const setupAnalyticsPagePath: RequestHandler = (req, res, next) => {
  const originalRender = res.render.bind(res);

  res.render = (...args: Parameters<typeof originalRender>) => {
    const route = req.route as IRoute | undefined;
    if (ERROR_STATUS_CODES.has(res.statusCode)) {
      res.locals.pageTemplatePath = `/errors/${res.statusCode}`;

      if (typeof route?.path === "string") {
        const { analyticsBasePath } = res.locals as {
          analyticsBasePath?: unknown;
        };
        const basePath =
          typeof analyticsBasePath === "string"
            ? analyticsBasePath
            : req.baseUrl;
        res.locals.attemptedRoute = `${basePath}${route.path}`.replace(
          /\/+/gv,
          "/",
        );
      }
    } else if (typeof route?.path === "string") {
      const { analyticsBasePath } = res.locals as {
        analyticsBasePath?: unknown;
      };
      const basePath =
        typeof analyticsBasePath === "string" ? analyticsBasePath : req.baseUrl;
      res.locals.pageTemplatePath = `${basePath}${route.path}`.replace(
        /\/+/gv,
        "/",
      );
    } else {
      const { path } = req;
      res.locals.pageTemplatePath = path;
    }

    originalRender(...args);
  };

  next();
};
