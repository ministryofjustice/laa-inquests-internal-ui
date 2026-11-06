import axios, {
  type AxiosError,
  type AxiosResponse,
  type AxiosStatic,
} from "axios";
import type {
  DateRangeReportKey,
  DateRangeReportResult,
  ReportsPort,
} from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import {
  buildInquestsApiHeaders,
  getInquestsApi,
} from "#src/adaptors/source/inquests-api/utils.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { translateReportApiFailure } from "#src/adaptors/source/inquests-api/reports/ReportsAPI/reportApiFailure.js";
import { DateRangeReportErrorSchema } from "#src/adaptors/models/dateRangeReportError.schema.js";
import { HTTP_UNPROCESSABLE_ENTITY } from "#src/infrastructure/express/constants.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const REPORT_DOWNLOAD_OPERATION = "report_download";
const COST_ESTIMATION_ROUTE = "/reports/cost-limit-forecast";

const DATE_RANGE_REPORT_ROUTES: Readonly<Record<DateRangeReportKey, string>> = {
  paymentsExtract: "/reports/payment-extract",
  claimsApplicationsProcessing: "/reports/decisions",
  costsForOtherDepartments: "/reports/ogd-costs",
  userAuditTrail: "/reports/audit-trail",
};

function isDateRangeRejection(error: unknown, route: string): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const { response } = error as AxiosError<ArrayBuffer>;
  if (response?.status !== HTTP_UNPROCESSABLE_ENTITY) {
    return false;
  }
  try {
    // The body is an ArrayBuffer because the request uses responseType "arraybuffer".
    const body: unknown = JSON.parse(
      Buffer.from(response.data).toString("utf8"),
    );
    return DateRangeReportErrorSchema.safeParse(body).success;
  } catch {
    logger.logWarn({
      functionName: "reports_api_adaptor",
      message: "Date range report 422 response body was not valid JSON",
      extraContext: {
        event: "outbound_api_response_unparseable",
        route,
        upstream_status_code: HTTP_UNPROCESSABLE_ENTITY,
      },
    });
    return false;
  }
}

export class ReportsAPIAdaptor implements ReportsPort {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getApplicationsBacklogReport(
    accessToken: string | undefined,
  ): Promise<{ data: Buffer; contentType: string }> {
    const startedAt = Date.now();
    try {
      const response: AxiosResponse<ArrayBuffer> = await getInquestsApi({
        http: this.http,
        baseUrl: this.baseUrl,
        path: "/reports/applications/backlog",
        accessToken,
        axiosConfig: { responseType: "arraybuffer" },
      });

      logger.logInfo({
        functionName: "reports_api_adaptor",
        message: "Applications backlog report requested upstream",
        extraContext: {
          event: "outbound_api_call",
          route: "/reports/applications/backlog",
          duration_ms: Date.now() - startedAt,
        },
      });

      const { headers, data } = response;
      const { "content-type": contentType } = headers;
      const contentTypeString =
        typeof contentType === "string" ? contentType : "text/csv";

      return {
        data: Buffer.from(data),
        contentType: contentTypeString,
      };
    } catch (error) {
      throw translateReportApiFailure(error);
    }
  }

  async getClaimsBacklogReport(
    accessToken: string | undefined,
  ): Promise<{ data: Buffer; contentType: string }> {
    const startedAt = Date.now();
    try {
      const response: AxiosResponse<ArrayBuffer> = await getInquestsApi({
        http: this.http,
        baseUrl: this.baseUrl,
        path: "/reports/claims/backlog",
        accessToken,
        axiosConfig: { responseType: "arraybuffer" },
      });

      logger.logInfo({
        functionName: "reports_api_adaptor",
        message: "Claims backlog report requested upstream",
        extraContext: {
          event: "outbound_api_call",
          route: "/reports/claims/backlog",
          duration_ms: Date.now() - startedAt,
        },
      });

      const { headers, data } = response;
      const { "content-type": contentType } = headers;
      const contentTypeString =
        typeof contentType === "string" ? contentType : "text/csv";

      return {
        data: Buffer.from(data),
        contentType: contentTypeString,
      };
    } catch (error) {
      throw translateReportApiFailure(error);
    }
  }

  async getCostEstimationReport(accessToken: string | undefined): Promise<{
    data: Buffer;
    contentType: string;
    contentDisposition: string | undefined;
  }> {
    const startedAt = Date.now();
    try {
      const response: AxiosResponse<ArrayBuffer> = await getInquestsApi({
        http: this.http,
        baseUrl: this.baseUrl,
        path: COST_ESTIMATION_ROUTE,
        accessToken,
        axiosConfig: { responseType: "arraybuffer" },
      });

      logger.logInfo({
        functionName: "reports_api_adaptor",
        message: "Cost estimation report requested upstream",
        extraContext: {
          event: "outbound_api_call",
          route: COST_ESTIMATION_ROUTE,
          duration_ms: Date.now() - startedAt,
        },
      });

      const { headers, data } = response;
      const {
        "content-type": contentType,
        "content-disposition": contentDisposition,
      } = headers;

      return {
        data: Buffer.from(data),
        contentType: typeof contentType === "string" ? contentType : "text/csv",
        contentDisposition:
          typeof contentDisposition === "string"
            ? contentDisposition
            : undefined,
      };
    } catch (error) {
      throw translateReportApiFailure(error);
    }
  }

  async getDateRangeReport(
    report: DateRangeReportKey,
    from: string,
    to: string,
    accessToken: string | undefined,
  ): Promise<DateRangeReportResult> {
    const startedAt = Date.now();
    const { [report]: route } = DATE_RANGE_REPORT_ROUTES;
    if (typeof accessToken !== "string" || accessToken === "") {
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        REPORT_DOWNLOAD_OPERATION,
        false,
      );
    }
    try {
      // Called directly rather than via getInquestsApi so the 422 body is still available.
      const response = await this.http.get<ArrayBuffer>(
        `${this.baseUrl}${route}`,
        {
          responseType: "arraybuffer",
          params: { from, to },
          headers: buildInquestsApiHeaders(accessToken),
        },
      );

      logger.logInfo({
        functionName: "reports_api_adaptor",
        message: "Date range report requested upstream",
        extraContext: {
          event: "outbound_api_call",
          route,
          duration_ms: Date.now() - startedAt,
        },
      });

      const { headers, data } = response;
      const {
        "content-type": contentType,
        "content-disposition": contentDisposition,
      } = headers;

      return {
        status: "SUCCESS",
        data: Buffer.from(data),
        contentType: typeof contentType === "string" ? contentType : "text/csv",
        contentDisposition:
          typeof contentDisposition === "string"
            ? contentDisposition
            : undefined,
      };
    } catch (error) {
      if (isDateRangeRejection(error, route)) {
        logger.logWarn({
          functionName: "reports_api_adaptor",
          message: "Date range report date range rejected upstream",
          extraContext: {
            event: "outbound_api_validation_rejected",
            route,
            upstream_status_code: HTTP_UNPROCESSABLE_ENTITY,
            duration_ms: Date.now() - startedAt,
          },
        });
        return { status: "DATE_RANGE_TOO_LONG" };
      }
      logger.logError({
        functionName: "reports_api_adaptor",
        message: "Date range report request failed",
        err: error,
        extraContext: {
          event: "outbound_api_request_failed",
          operation: REPORT_DOWNLOAD_OPERATION,
          method: "GET",
          route,
          duration_ms: Date.now() - startedAt,
        },
      });
      throw translateReportApiFailure(error);
    }
  }
}
