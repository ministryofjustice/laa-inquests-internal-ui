import type { IRoute, RequestHandler } from "express";
import { HTTP_NOT_FOUND } from "#src/infrastructure/express/constants.js";

export const setupAnalyticsPagePath: RequestHandler = (req, res, next) => {
  const originalRender = res.render.bind(res);

  res.render = (...args: Parameters<typeof originalRender>) => {
    const route = req.route as IRoute | undefined;
    if (res.statusCode !== HTTP_NOT_FOUND && typeof route?.path === "string") {
      const basePath = req.baseUrl || "";
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
