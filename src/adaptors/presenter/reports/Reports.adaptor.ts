import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import type { DownloadCostEstimationReportUseCase } from "#src/use-cases/reports/DownloadCostEstimationReport.useCase.js";
import type { DownloadDateRangeReportUseCase } from "#src/use-cases/reports/DownloadDateRangeReport.useCase.js";
import {
  buildDateRangeTooLongErrors,
  type DateRangeReportValidator,
} from "./DateRangeReport/DateRangeReport.validator.js";
import type {
  DateRangeReportForm,
  DateRangeReportFormErrors,
} from "./DateRangeReport/models/form.types.js";
import type { DateRangeReportDefinition } from "./reportDefinitions.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_TOO_MANY_REQUESTS,
} from "#src/infrastructure/express/errorConstants.js";
import config from "#src/infrastructure/config/config.js";

const DATE_RANGE_REPORT_TEMPLATE = "reports/date-range-report";

interface ReportUseCases {
  downloadApplicationsBacklogReportUseCase: DownloadApplicationsBacklogReportUseCase;
  downloadClaimsBacklogReportUseCase: DownloadClaimsBacklogReportUseCase;
  downloadCostEstimationReportUseCase: DownloadCostEstimationReportUseCase;
  downloadDateRangeReportUseCase: DownloadDateRangeReportUseCase;
}

const DATE_RANGE_ERROR_FIELDS: Array<{
  field: keyof DateRangeReportFormErrors;
  idPrefix: string;
}> = [
  { field: "startDate", idPrefix: "start-date" },
  { field: "endDate", idPrefix: "end-date" },
];

export class ReportsAdaptor {
  constructor(
    private readonly useCases: ReportUseCases,
    private readonly dateRangeReportValidator: DateRangeReportValidator,
  ) {}

  renderReportsPage(req: Request, res: Response): void {
    logger.logInfo({
      functionName: "render_reports_page",
      message: "Reports page requested",
      request: req,
      extraContext: {
        event: "reports_page_requested",
      },
    });
    res.render("reports/index", { backUrl: "/" });
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

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date())
        .map(({ type, value }) => [type, value]),
    );

    const timestamp =
      `${parts.year}-${parts.month}-${parts.day}-` +
      `${parts.hour}${parts.minute}${parts.second}`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${timestamp} - Report - IDDS Applications Backlog - OFFICIAL-SENSITIVE - LAA Use Only.csv"`,
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

  async downloadCostEstimation(req: Request, res: Response): Promise<void> {
    logger.logInfo({
      functionName: "download_cost_estimation_report",
      message: "Cost estimation report requested",
      request: req,
      extraContext: {
        event: "cost_estimation_report_requested",
      },
    });

    const { data, contentType, contentDisposition } =
      await this.useCases.downloadCostEstimationReportUseCase.execute(
        req.session.user?.accessToken,
      );

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      contentDisposition ??
        'attachment; filename="cost-estimation-and-forecasting.csv"',
    );
    res.send(data);
  }

  renderDateRangeReportPage(
    report: DateRangeReportDefinition,
    req: Request,
    res: Response,
  ): void {
    logger.logInfo({
      functionName: "render_date_range_report_page",
      message: "Date range report page requested",
      request: req,
      extraContext: {
        event: "date_range_report_page_requested",
        report: report.key,
      },
    });
    res.render(DATE_RANGE_REPORT_TEMPLATE, {
      ...this.#viewModel(report),
      formValues: this.#readDateRangeForm(req),
    });
  }

  async downloadDateRangeReport(
    report: DateRangeReportDefinition,
    req: Request,
    res: Response,
  ): Promise<void> {
    logger.logInfo({
      functionName: "download_date_range_report",
      message: "Date range report requested",
      request: req,
      extraContext: {
        event: "date_range_report_requested",
        report: report.key,
      },
    });

    const form = this.#readDateRangeForm(req);
    const errors = this.dateRangeReportValidator.validateDateRangeReportForm(
      form,
      report.maxDays,
    );

    if (Object.keys(errors).length > EMPTY_ARR_LENGTH) {
      this.#renderDateRangeErrors(res, report, form, errors);
      return;
    }
    if (res.locals.rateLimit === true) {
      res.status(HTTP_TOO_MANY_REQUESTS).render(DATE_RANGE_REPORT_TEMPLATE, {
        ...this.#viewModel(report),
        formValues: form,
        shouldShowRateLimitText: true,
        config,
      });
      return;
    }

    const from = this.#isoDate(form, "start");
    const to = this.#isoDate(form, "end");
    const result = await this.useCases.downloadDateRangeReportUseCase.execute(
      report.key,
      from,
      to,
      req.session.user?.accessToken,
    );

    if (result.status === "DATE_RANGE_TOO_LONG") {
      this.#renderDateRangeErrors(
        res,
        report,
        form,
        buildDateRangeTooLongErrors(report.maxDays),
      );
      return;
    }

    const { data, contentType, contentDisposition } = result;
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      contentDisposition ??
        `attachment; filename="${report.slug}-${from}-to-${to}.csv"`,
    );
    res.send(data);
  }

  #viewModel(report: DateRangeReportDefinition): {
    backUrl: string;
    reportKey: string;
    reportSlug: string;
    maxDays: number;
  } {
    return {
      backUrl: "/reports",
      reportKey: report.key,
      reportSlug: report.slug,
      maxDays: report.maxDays,
    };
  }

  #renderDateRangeErrors(
    res: Response,
    report: DateRangeReportDefinition,
    form: DateRangeReportForm,
    errors: Partial<DateRangeReportFormErrors>,
  ): void {
    res.status(HTTP_BAD_REQUEST).render(DATE_RANGE_REPORT_TEMPLATE, {
      ...this.#viewModel(report),
      formValues: form,
      errorSummaries: errors,
      errorList: DATE_RANGE_ERROR_FIELDS.flatMap(({ field, idPrefix }) => {
        const { [field]: error } = errors;
        if (error === undefined || error.inSummary === false) {
          return [];
        }
        const firstField = error.fields.at(0) ?? "day";
        return [{ text: error.text, href: `#${idPrefix}-${firstField}` }];
      }),
    });
  }

  #readDateRangeForm({ query }: Request): DateRangeReportForm {
    const read = (field: keyof DateRangeReportForm): string => {
      const { [field]: value } = query;
      return typeof value === "string" ? value : "";
    };
    return {
      "start-date-day": read("start-date-day"),
      "start-date-month": read("start-date-month"),
      "start-date-year": read("start-date-year"),
      "end-date-day": read("end-date-day"),
      "end-date-month": read("end-date-month"),
      "end-date-year": read("end-date-year"),
    };
  }

  #isoDate(form: DateRangeReportForm, prefix: "start" | "end"): string {
    const day = form[`${prefix}-date-day`].trim().padStart(2, "0");
    const month = form[`${prefix}-date-month`].trim().padStart(2, "0");
    const year = form[`${prefix}-date-year`].trim();
    return `${year}-${month}-${day}`;
  }
}
