import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import type { DownloadPaymentExtractReportUseCase } from "#src/use-cases/reports/DownloadPaymentExtractReport.useCase.js";
import type { PaymentExtractValidator } from "./PaymentExtract/PaymentExtract.validator.js";
import type {
  PaymentExtractForm,
  PaymentExtractFormErrors,
} from "./PaymentExtract/models/form.types.js";
import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_TOO_MANY_REQUESTS,
} from "#src/infrastructure/express/constants.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import config from "#src/infrastructure/config/config.js";

const {
  pages: {
    reports: {
      paymentExtract: {
        validationErrors: { dateRangeTooLong },
      },
    },
  },
} = en;

interface ReportUseCases {
  downloadApplicationsBacklogReportUseCase: DownloadApplicationsBacklogReportUseCase;
  downloadClaimsBacklogReportUseCase: DownloadClaimsBacklogReportUseCase;
  downloadPaymentExtractReportUseCase: DownloadPaymentExtractReportUseCase;
}

const PAYMENT_EXTRACT_ERROR_HREFS: Array<{
  field: keyof PaymentExtractFormErrors;
  href: string;
}> = [
  { field: "fromDate", href: "#from-date-day" },
  { field: "toDate", href: "#to-date-day" },
];

export class ReportsAdaptor {
  constructor(
    private readonly useCases: ReportUseCases,
    private readonly paymentExtractValidator: PaymentExtractValidator,
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

  async downloadPaymentExtract(req: Request, res: Response): Promise<void> {
    logger.logInfo({
      functionName: "download_payment_extract_report",
      message: "Payment extract report requested",
      request: req,
      extraContext: {
        event: "payment_extract_report_requested",
      },
    });

    const form = this.#readPaymentExtractForm(req);
    const errors =
      this.paymentExtractValidator.validatePaymentExtractForm(form);

    if (Object.keys(errors).length > EMPTY_ARR_LENGTH) {
      this.#renderPaymentExtractErrors(res, form, errors);
      return;
    }
    if (res.locals.rateLimit === true) {
      this.#renderRateLimitError(res);
      return;
    }

    const from = this.#isoDate(form, "from");
    const to = this.#isoDate(form, "to");
    const result =
      await this.useCases.downloadPaymentExtractReportUseCase.execute(
        from,
        to,
        req.session.user?.accessToken,
      );

    if (result.status === "DATE_RANGE_TOO_LONG") {
      this.#renderPaymentExtractErrors(res, form, {
        toDate: { text: dateRangeTooLong },
      });
      return;
    }

    const { data, contentType, contentDisposition } = result;
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      contentDisposition ??
        `attachment; filename="payment-extract-${from}-to-${to}.csv"`,
    );
    res.send(data);
  }

  #renderPaymentExtractErrors(
    res: Response,
    form: PaymentExtractForm,
    errors: Partial<PaymentExtractFormErrors>,
  ): void {
    res.status(HTTP_BAD_REQUEST).render("reports/index", {
      backUrl: "/",
      formValues: form,
      errorSummaries: errors,
      errorList: PAYMENT_EXTRACT_ERROR_HREFS.flatMap(({ field, href }) => {
        const { [field]: error } = errors;
        return error === undefined ? [] : [{ text: error.text, href }];
      }),
    });
  }

  #renderRateLimitError(res: Response): void {
    res.status(HTTP_TOO_MANY_REQUESTS).render("reports/index", {
      backUrl: "/",
      shouldShowRateLimitText: true,
      config,
    });
  }

  #readPaymentExtractForm({ query }: Request): PaymentExtractForm {
    const read = (field: keyof PaymentExtractForm): string => {
      const { [field]: value } = query;
      return typeof value === "string" ? value : "";
    };
    return {
      "from-date-day": read("from-date-day"),
      "from-date-month": read("from-date-month"),
      "from-date-year": read("from-date-year"),
      "to-date-day": read("to-date-day"),
      "to-date-month": read("to-date-month"),
      "to-date-year": read("to-date-year"),
    };
  }

  #isoDate(form: PaymentExtractForm, prefix: "from" | "to"): string {
    const day = form[`${prefix}-date-day`].trim().padStart(2, "0");
    const month = form[`${prefix}-date-month`].trim().padStart(2, "0");
    const year = form[`${prefix}-date-year`].trim();
    return `${year}-${month}-${day}`;
  }
}
