import type { NextFunction, Request, Response, Router } from "express";
import type { HelpAdaptor } from "#src/adaptors/presenter/footer/Help.adaptor.js";

export function createHelpRouter(
  helpRouter: Router,
  helpAdaptor: HelpAdaptor,
): Router {
  helpRouter.get(
    "/",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        helpAdaptor.renderPage(res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return helpRouter;
}
