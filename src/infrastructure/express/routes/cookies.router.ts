import type { NextFunction, Request, Response, Router } from "express";
import type { CookiesAdaptor } from "#src/adaptors/presenter/cookies/Cookies.adaptor.js";

export function createCookiesRouter(
  cookiesRouter: Router,
  cookiesAdaptor: CookiesAdaptor,
): Router {
  cookiesRouter.get(
    "/",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        cookiesAdaptor.renderCookiesPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return cookiesRouter;
}
