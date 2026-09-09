import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";

interface ReportUseCases {
  downloadApplicationsBacklogReportUseCase: DownloadApplicationsBacklogReportUseCase;
  downloadClaimsBacklogReportUseCase: DownloadClaimsBacklogReportUseCase;
}

export class ReportsAdaptor {
  constructor(private readonly useCases: ReportUseCases) {}

  renderReportsPage(req: Request, res: Response): void {
    logger.logInfo({
      functionName: "render_reports_page",
      message: "Reports page requested",
      request: req,
      extraContext: {
        event: "reports_page_requested",
      },
    });
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

    const { data, contentType } =
      await this.useCases.downloadApplicationsBacklogReportUseCase.execute(
        req.session.user?.accessToken,
      );

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="applications-backlog.csv"',
    );
    res.send(data);
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

    const { data, contentType } =
      await this.useCases.downloadClaimsBacklogReportUseCase.execute(
        req.session.user?.accessToken,
      );

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="claims-backlog.csv"',
    );
    res.send(data);
  }
}
