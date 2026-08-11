import type { Request, Response } from "express";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export class ReportsAdaptor {
  constructor(private readonly applicationPort: ApplicationPort) {}

  renderReportsPage(req: Request, res: Response): void {
    res.render("reports/index");
  }

  async downloadApplicationsBacklog(
    req: Request,
    res: Response,
  ): Promise<void> {
    logger.logInfo(
      "GET Applications Backlog Report",
      "Applications backlog report requested.",
      req,
    );

    try {
      const { data, contentType } =
        await this.applicationPort.getApplicationsBacklogReport(
          req.session.user?.accessToken,
        );

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="applications-backlog.csv"',
      );
      res.send(data);
    } catch (error) {
      logger.logError(
        "GET Applications Backlog Report",
        "Failed to retrieve applications backlog report",
        error,
        req,
      );

      res.status(500).render("application/error", {
        status: "Unable to retrieve report",
        error: "Unable to retrieve report. Please try again later",
      });
    }
  }

  async downloadClaimsBacklog(req: Request, res: Response): Promise<void> {
    logger.logInfo(
      "GET Claims Backlog Report",
      "Claims backlog report requested.",
      req,
    );

    try {
      const { data, contentType } =
        await this.applicationPort.getClaimsBacklogReport(
          req.session.user?.accessToken,
        );

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="claims-backlog.csv"',
      );
      res.send(data);
    } catch (error) {
      logger.logError(
        "GET Claims Backlog Report",
        "Failed to retrieve claims backlog report",
        error,
        req,
      );

      res.status(500).render("application/error", {
        status: "Unable to retrieve report",
        error: "Unable to retrieve report. Please try again later",
      });
    }
  }
}
