import type { IRoute, RequestHandler } from "express";

export const setupAnalyticsPagePath: RequestHandler = (req, res, next) => {
  const originalRender = res.render.bind(res);

  res.render = (...args: Parameters<typeof originalRender>) => {
    const route = req.route as IRoute | undefined;
    if (typeof route?.path === "string") {
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
