import type { NextFunction, Request, Response, Router } from "express";
import type { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import { setupReportRateLimiter } from "../middleware/security/setupReportsRateLimiter.js";
import config from "#src/infrastructure/config/config.js";

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
    setupReportRateLimiter(config, "Applications"),
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
    setupReportRateLimiter(config, "Claims"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await reportsAdaptor.downloadClaimsBacklog(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  reportsRouter.get(
    "/payment-extract",
    setupReportRateLimiter(config, "Payment extract"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await reportsAdaptor.downloadPaymentExtract(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return reportsRouter;
}
