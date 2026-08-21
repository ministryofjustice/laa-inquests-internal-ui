import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import { getInquestsApi } from "#src/adaptors/source/inquests-api/utils.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export class ReportsAPIAdaptor implements ReportsPort {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getApplicationsBacklogReport(
    accessToken: string | undefined,
  ): Promise<{ data: Buffer; contentType: string }> {
    const startedAt = Date.now();
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
  }

  async getClaimsBacklogReport(
    accessToken: string | undefined,
  ): Promise<{ data: Buffer; contentType: string }> {
    const startedAt = Date.now();
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
  }
}
