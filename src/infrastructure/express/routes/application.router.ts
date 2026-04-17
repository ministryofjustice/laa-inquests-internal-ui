import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationDisplayAdaptor } from "#src/adaptors/application.adaptor.js";

function createApplicationRouter(
  applicationRouter: Router,
  applicationDisplayAdaptor: ApplicationDisplayAdaptor,
): Router {
  applicationRouter.get(
    "/:applicationId",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam: string = applicationId;
      try {
        await applicationDisplayAdaptor.renderApplicationPage(
          req,
          res,
          applicationIdParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );
  return applicationRouter;
}

export default createApplicationRouter;
