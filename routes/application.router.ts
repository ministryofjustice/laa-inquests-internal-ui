import type { NextFunction, Request, Response, Router } from "express";
// import { logger } from "#src/infrastructure/logger/logger.js";
import type { ApplicationDisplayAdaptor } from "#src/adaptors/application-display.adaptor.js";

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
      const applicationIdParam: string = applicationId.toString();
      try {
        await applicationDisplayAdaptor.renderApplicationPage(
          req,
          res,
          applicationIdParam,
        );
      } catch (err: unknown) {
        // logger.logError(
        //   req.method,
        //   `Error Getting Application "${applicationIdParam}"`,
        //   err,
        //   req,
        // );
        next(err);
      }
    },
  );
  return applicationRouter;
}

export default createApplicationRouter;
