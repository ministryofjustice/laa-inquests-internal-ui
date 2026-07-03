import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";

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

  applicationRouter.get(
    "/:applicationId/coroners-letter",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { applicationId },
      } = req;
      const applicationIdParam: string = applicationId as string;
      try {
        await applicationDisplayAdaptor.serveCoronersLetterDocument(
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
