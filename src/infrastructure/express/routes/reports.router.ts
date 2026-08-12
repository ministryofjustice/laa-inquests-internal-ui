import type { NextFunction, Request, Response, Router } from "express";
import type { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";

export function createReportsRouter(
  reportsRouter: Router,
  reportsAdaptor: ReportsAdaptor,
): Router {
  reportsRouter.get(
    "/",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        reportsAdaptor.renderReportsPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  reportsRouter.get(
    "/applications/backlog",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await reportsAdaptor.downloadApplicationsBacklog(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  reportsRouter.get(
    "/claims/backlog",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await reportsAdaptor.downloadClaimsBacklog(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return reportsRouter;
}
