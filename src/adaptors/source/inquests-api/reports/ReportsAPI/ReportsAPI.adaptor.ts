import axios, {
  type AxiosError,
  type AxiosResponse,
  type AxiosStatic,
} from "axios";
import type {
  PaymentExtractReportResult,
  ReportsPort,
} from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import { getInquestsApi } from "#src/adaptors/source/inquests-api/utils.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { translateReportApiFailure } from "#src/adaptors/source/inquests-api/reports/ReportsAPI/reportApiFailure.js";
import { PaymentExtractDateRangeErrorSchema } from "#src/adaptors/models/paymentExtractError.schema.js";
import { HTTP_UNPROCESSABLE_ENTITY } from "#src/infrastructure/express/constants.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const PAYMENT_EXTRACT_OPERATION = "report_download";
const PAYMENT_EXTRACT_ROUTE = "/reports/payment-extract";

function isDateRangeRejection(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const { response } = error as AxiosError<ArrayBuffer>;
  if (response?.status !== HTTP_UNPROCESSABLE_ENTITY) {
    return false;
  }
  let body: unknown;
  try {
    // The body is an ArrayBuffer because the request uses responseType "arraybuffer".
    body = JSON.parse(Buffer.from(response.data).toString("utf8"));
  } catch {
    logger.logWarn({
      functionName: "reports_api_adaptor",
      message: "Payment extract 422 response body was not valid JSON",
      extraContext: {
        event: "outbound_api_response_unparseable",
        route: PAYMENT_EXTRACT_ROUTE,
        upstream_status_code: HTTP_UNPROCESSABLE_ENTITY,
      },
    });
    return false;
  }
  return PaymentExtractDateRangeErrorSchema.safeParse(body).success;
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

  async getPaymentExtractReport(
    from: string,
    to: string,
    accessToken: string | undefined,
  ): Promise<PaymentExtractReportResult> {
    const startedAt = Date.now();
    if (typeof accessToken !== "string" || accessToken === "") {
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        PAYMENT_EXTRACT_OPERATION,
        false,
      );
    }
    try {
      // Called directly rather than via getInquestsApi so the 422 body is still available.
      const response = await this.http.get<ArrayBuffer>(
        `${this.baseUrl}${PAYMENT_EXTRACT_ROUTE}`,
        {
          responseType: "arraybuffer",
          params: { from, to },
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      logger.logInfo({
        functionName: "reports_api_adaptor",
        message: "Payment extract report requested upstream",
        extraContext: {
          event: "outbound_api_call",
          route: "/reports/payment-extract",
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
      if (isDateRangeRejection(error)) {
        logger.logWarn({
          functionName: "reports_api_adaptor",
          message: "Payment extract date range rejected upstream",
          extraContext: {
            event: "outbound_api_validation_rejected",
            route: "/reports/payment-extract",
            upstream_status_code: HTTP_UNPROCESSABLE_ENTITY,
            duration_ms: Date.now() - startedAt,
          },
        });
        return { status: "DATE_RANGE_TOO_LONG" };
      }
      logger.logError({
        functionName: "reports_api_adaptor",
        message: "Payment extract report request failed",
        err: error,
        extraContext: {
          event: "outbound_api_request_failed",
          operation: PAYMENT_EXTRACT_OPERATION,
          method: "GET",
          route: PAYMENT_EXTRACT_ROUTE,
          duration_ms: Date.now() - startedAt,
        },
      });
      throw translateReportApiFailure(error);
    }
  }
}
