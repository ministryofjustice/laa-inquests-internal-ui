import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationAdaptor } from "#src/adaptors/Application.adaptor.js";

function createApplicationRouter(
  applicationRouter: Router,
  applicationDisplayAdaptor: ApplicationAdaptor,
): Router {
  applicationRouter.get(
    "/:applicationId/overview",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam: string = applicationId as string;
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
