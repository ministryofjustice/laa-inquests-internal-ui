import type { NextFunction, Request, Response, Router } from "express";
import type { CookiesAdaptor } from "#src/adaptors/presenter/cookies/Cookies.adaptor.js";

export function createCookiesRouter(
  cookiesRouter: Router,
  cookiesAdaptor: CookiesAdaptor,
): Router {
  cookiesRouter.post(
    "/banner",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        cookiesAdaptor.saveBannerPreferences(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

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

  cookiesRouter.post(
    "/",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        cookiesAdaptor.saveCookiesPreferences(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return cookiesRouter;
}
