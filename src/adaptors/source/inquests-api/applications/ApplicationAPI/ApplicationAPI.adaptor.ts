import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  Application,
  ApplicationSummary,
  Certificate,
  HistoryEvent,
  PublicBody,
  RefusalReason,
} from "../../../../models/application.types.js";
import {
  ApplicationSchema,
  ApplicationSummarySchema,
  CertificateSchema,
  HistoryEventSchema,
  PublicBodySchema,
} from "../../../../models/application.schema.js";
import { REFUSAL_REASON_MAP } from "../../../../models/application.types.js";
import { APPLICATION_STATUSES } from "#src/infrastructure/locales/constants.js";
import { OUTBOUND_ADAPTER_FAILURE_REASONS } from "#src/ports/common/outboundAdapterResult.types.js";
import type { OutboundAdapterResult } from "#src/ports/common/outboundAdapterResult.types.js";
import {
  patchInquestsApi,
  getInquestsApi,
} from "#src/adaptors/source/inquests-api/utils.js";

export class ApplicationAPIAdaptor {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getAllApplications(
    accessToken: string | undefined,
  ): Promise<ApplicationSummary[]> {
    const {
      data,
    }: AxiosResponse<
      Array<{
        laa_reference: number | null;
        created_at: string;
        status: string | null;
        overall_decision: string | null;
      }>
    > = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: "/applications/",
      accessToken,
    });
    return data
      .map((application) => ({
        laaReference: application.laa_reference,
        createdAt: application.created_at,
        status: mapApplicationStatusForDisplay(application.status),
        overallDecision: application.overall_decision,
      }))
      .map((application) => ApplicationSummarySchema.parse(application));
  }

  async getApplication(
    applicationId: string,
    accessToken: string | undefined,
  ): Promise<Application> {
    const { data }: AxiosResponse<Application> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}`,
      accessToken,
    });
    const application = ApplicationSchema.parse(data);

    return {
      ...application,
      status:
        mapApplicationStatusForDisplay(application.status) ??
        application.status,
    };
  }

  async submitRefuseDecision(
    applicationId: string,
    accessToken: string | undefined,
    refusalReason: string,
    justification: string,
  ): Promise<void> {
    const payload: {
      reasonForRefusal: RefusalReason;
      justification: string;
    } = {
      reasonForRefusal: REFUSAL_REASON_MAP[refusalReason],
      justification,
    };

    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/refuse-decision`,
      body: payload,
      accessToken,
    });
  }

  async submitGrantDecision(
    applicationId: string,
    accessToken: string | undefined,
    certificateStartDate: string,
  ): Promise<void> {
    const payload: {
      certificateStartDate: string;
    } = {
      certificateStartDate,
    };

    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/grant-decision`,
      body: payload,
      accessToken,
    });
  }

  async getCoronersLetterDocument(
    applicationId: string,
    accessToken: string | undefined,
  ): Promise<{ data: Buffer; contentType: string }> {
    const response: AxiosResponse<ArrayBuffer> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/coroners-letter`,
      accessToken,
      axiosConfig: { responseType: "arraybuffer" },
    });

    const { headers, data } = response;
    const { "content-type": contentType } = headers;
    const contentTypeString =
      typeof contentType === "string"
        ? contentType
        : "application/octet-stream";

    return {
      data: Buffer.from(data),
      contentType: contentTypeString,
    };
  }

  async getCertificateDetails(
    applicationId: string,
    accessToken: string | undefined,
  ): Promise<OutboundAdapterResult<Certificate>> {
    try {
      const { data }: AxiosResponse<Certificate> = await getInquestsApi({
        http: this.http,
        baseUrl: this.baseUrl,
        path: `/applications/${applicationId}/certificate`,
        accessToken,
      });

      const certificate = CertificateSchema.parse(data);

      return {
        status: "SUCCESS",
        data: {
          ...certificate,
          status:
            mapApplicationStatusForDisplay(certificate.status) ??
            certificate.status,
          currentProceedingStatus:
            mapApplicationStatusForDisplay(
              certificate.currentProceedingStatus,
            ) ?? certificate.currentProceedingStatus,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          status: "FAILURE",
          reason: OUTBOUND_ADAPTER_FAILURE_REASONS.RESOURCE_NOT_FOUND,
          message: `Certificate not found for application ${applicationId}`,
          cause: error,
        };
      }

      return {
        status: "FAILURE",
        reason: OUTBOUND_ADAPTER_FAILURE_REASONS.UPSTREAM_REJECTED,
        message: `Failed to retrieve certificate for application ${applicationId}`,
        cause: error,
      };
    }
  }

  async getApplicationHistory(
    applicationId: string,
    accessToken: string | undefined,
  ): Promise<HistoryEvent[]> {
    const { data }: AxiosResponse<HistoryEvent[]> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/history`,
      accessToken,
    });

    return data.map((event) => HistoryEventSchema.parse(event));
  }

  async getPublicBodies(
    accessToken: string | undefined,
  ): Promise<PublicBody[]> {
    const { data }: AxiosResponse<PublicBody[]> = await getInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: "/applications/public-bodies",
      accessToken,
    });

    return data.map((publicBody) => PublicBodySchema.parse(publicBody));
  }

  async updateApplicationPublicBodies(
    applicationId: string,
    accessToken: string | undefined,
    publicBodyIds: string[],
  ): Promise<void> {
    const payload: { publicBodies: string[] } = {
      publicBodies: publicBodyIds,
    };

    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${applicationId}/public-bodies`,
      body: payload,
      accessToken,
    });
  }
}

function mapApplicationStatusForDisplay(status: string | null): string | null {
  if (!status) {
    return status;
  }

  return (APPLICATION_STATUSES as Record<string, string>)[status] ?? status;
}
