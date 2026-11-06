import type { NextFunction, Request, Response, Router } from "express";
import type { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import { setupReportRateLimiter } from "../middleware/security/setupReportsRateLimiter.js";
import config from "#src/infrastructure/config/config.js";
import { DATE_RANGE_REPORTS } from "#src/adaptors/presenter/reports/reportDefinitions.js";

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
    "/cost-estimation-and-forecasting",
    setupReportRateLimiter(config, "Cost estimation and forecasting"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await reportsAdaptor.downloadCostEstimation(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  for (const report of DATE_RANGE_REPORTS) {
    reportsRouter.get(
      `/${report.slug}`,
      (req: Request, res: Response, next: NextFunction): void => {
        try {
          reportsAdaptor.renderDateRangeReportPage(report, req, res);
        } catch (err: unknown) {
          next(err);
        }
      },
    );

    reportsRouter.get(
      `/${report.slug}/download`,
      setupReportRateLimiter(config, report.rateLimitLabel, {
        renderOnReportPage: true,
      }),
      async (
        req: Request,
        res: Response,
        next: NextFunction,
      ): Promise<void> => {
        try {
          await reportsAdaptor.downloadDateRangeReport(report, req, res);
        } catch (err: unknown) {
          next(err);
        }
      },
    );
  }

  return reportsRouter;
}
