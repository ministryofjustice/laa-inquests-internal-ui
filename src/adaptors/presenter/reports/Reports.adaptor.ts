import type { Request, Response } from "express";
import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export class ReportsAdaptor {
  constructor(private readonly reportsPort: ReportsPort) {}

  renderReportsPage(req: Request, res: Response): void {
    res.render("reports/index");
  }

  async downloadApplicationsBacklog(
    req: Request,
    res: Response,
  ): Promise<void> {
    logger.logInfo({
      functionName: "download_applications_backlog_report",
      message: "Applications backlog report requested",
      request: req,
      extraContext: {
        event: "applications_backlog_report_requested",
      },
    });

    try {
      const { data, contentType } =
        await this.reportsPort.getApplicationsBacklogReport(
          req.session.user?.accessToken,
        );

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="applications-backlog.csv"',
      );
      res.send(data);
    } catch (error) {
      logger.logError({
        functionName: "download_applications_backlog_report",
        message: "Failed to retrieve applications backlog report",
        err: error,
        request: req,
        extraContext: {
          event: "applications_backlog_report_failed",
        },
      });

      res.status(500).render("application/error", {
        status: "Unable to retrieve report",
        error: "Unable to retrieve report. Please try again later",
      });
    }
  }

  async downloadClaimsBacklog(req: Request, res: Response): Promise<void> {
    logger.logInfo({
      functionName: "download_claims_backlog_report",
      message: "Claims backlog report requested",
      request: req,
      extraContext: {
        event: "claims_backlog_report_requested",
      },
    });

    try {
      const { data, contentType } =
        await this.reportsPort.getClaimsBacklogReport(
          req.session.user?.accessToken,
        );

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="claims-backlog.csv"',
      );
      res.send(data);
    } catch (error) {
      logger.logError({
        functionName: "download_claims_backlog_report",
        message: "Failed to retrieve claims backlog report",
        err: error,
        request: req,
        extraContext: {
          event: "claims_backlog_report_failed",
        },
      });

      res.status(500).render("application/error", {
        status: "Unable to retrieve report",
        error: "Unable to retrieve report. Please try again later",
      });
    }
  }
}
