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
  ApplicationSummarySchema,
  CertificateSchema,
  PublicBodySchema,
} from "../../../../models/application.schema.js";
import { REFUSAL_REASON_MAP } from "../../../../models/application.types.js";
import { APPLICATION_STATUSES } from "#src/infrastructure/locales/constants.js";
import {
  patchInquestsApi,
  getInquestsApi,
  postInquestsApi,
} from "#src/adaptors/source/inquests-api/utils.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import {
  classifyApplicationApiHttpFailure,
  getUpstreamStatusContext,
} from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/applicationApiFailure.js";

import {
  getApplication,
  getApplicationHistory,
  getCoronersLetterDocument,
} from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/applicationReadOperations.js";

const GET_CERTIFICATE = {
  operation: "get_certificate",
  method: "GET",
  route: "/applications/:id/certificate",
};

export class ApplicationAPIAdaptor {
  constructor(
    private readonly http: AxiosStatic = axios,
    private readonly baseUrl: string,
  ) {}

  async getAllApplications(
    accessToken: string | undefined,
  ): Promise<ApplicationSummary[]> {
    const startedAt = Date.now();
    const {
      data,
    }: AxiosResponse<
      Array<{
        laa_reference: string | null;
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
    logger.logInfo({
      functionName: "application_api_adaptor",
      message: "Applications list retrieved upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications",
        duration_ms: Date.now() - startedAt,
      },
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
    laaReference: string,
    accessToken: string | undefined,
  ): Promise<Application> {
    return await getApplication({
      http: this.http,
      baseUrl: this.baseUrl,
      laaReference,
      accessToken,
    });
  }

  async submitRefuseDecision(
    laaReference: string,
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

    const startedAt = Date.now();
    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${laaReference}/refuse-decision`,
      body: payload,
      accessToken,
    });
    logger.logInfo({
      functionName: "application_api_adaptor",
      message: "Refuse decision submitted upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications/:id/refuse-decision",
        laa_reference: laaReference,
        duration_ms: Date.now() - startedAt,
      },
    });
  }

  async submitGrantDecision(
    laaReference: string,
    accessToken: string | undefined,
    certificateStartDate: string,
  ): Promise<void> {
    const payload: {
      certificateStartDate: string;
    } = {
      certificateStartDate,
    };

    const startedAt = Date.now();
    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${laaReference}/grant-decision`,
      body: payload,
      accessToken,
    });
    logger.logInfo({
      functionName: "application_api_adaptor",
      message: "Grant decision submitted upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications/:id/grant-decision",
        laa_reference: laaReference,
        duration_ms: Date.now() - startedAt,
      },
    });
  }

  async getCoronersLetterDocument(
    laaReference: string,
    accessToken: string | undefined,
  ): Promise<{ data: Buffer; contentType: string } | undefined> {
    return await getCoronersLetterDocument({
      http: this.http,
      baseUrl: this.baseUrl,
      laaReference,
      accessToken,
    });
  }

  async getCertificateDetails(
    laaReference: string,
    accessToken: string | undefined,
  ): Promise<Certificate | undefined> {
    const startedAt = Date.now();

    if (typeof accessToken !== "string" || accessToken === "") {
      logger.logError({
        functionName: "application_api_adaptor",
        message: "Certificate request is missing credentials",
        extraContext: {
          event: "outbound_api_request_failed",
          operation: GET_CERTIFICATE.operation,
          upstream_method: GET_CERTIFICATE.method,
          upstream_route: GET_CERTIFICATE.route,
          failure_reason: "missing_credentials",
          retryable: false,
          duration_ms: Date.now() - startedAt,
          laa_reference: laaReference,
        },
      });
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        GET_CERTIFICATE.operation,
        false,
      );
    }

    try {
      const { data }: AxiosResponse<Certificate> = await this.http.get(
        `${this.baseUrl}/applications/${laaReference}/certificate`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const certificateResult = CertificateSchema.safeParse(data);
      if (!certificateResult.success) {
        logger.logError({
          functionName: "application_api_adaptor",
          message: "Certificate response validation failed",
          extraContext: {
            event: "outbound_api_request_failed",
            operation: GET_CERTIFICATE.operation,
            upstream_method: GET_CERTIFICATE.method,
            upstream_route: GET_CERTIFICATE.route,
            failure_reason: "invalid_response",
            retryable: false,
            duration_ms: Date.now() - startedAt,
            laa_reference: laaReference,
          },
        });
        throw new ApplicationError(
          APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
          GET_CERTIFICATE.operation,
          false,
        );
      }

      logger.logInfo({
        functionName: "application_api_adaptor",
        message: "Certificate details retrieved upstream",
        extraContext: {
          event: "outbound_api_call",
          operation: GET_CERTIFICATE.operation,
          upstream_method: GET_CERTIFICATE.method,
          upstream_route: GET_CERTIFICATE.route,
          duration_ms: Date.now() - startedAt,
          laa_reference: laaReference,
        },
      });

      const { data: certificate } = certificateResult;

      return {
        ...certificate,
        status:
          mapApplicationStatusForDisplay(certificate.status) ??
          certificate.status,
        currentProceedingStatus:
          mapApplicationStatusForDisplay(certificate.currentProceedingStatus) ??
          certificate.currentProceedingStatus,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      } else if (!axios.isAxiosError(error)) {
        throw error;
      }

      const failure = classifyApplicationApiHttpFailure(error);
      if (failure.outcome === "NOT_FOUND") {
        logger.logWarn({
          functionName: "application_api_adaptor",
          message: "Certificate not found upstream",
          extraContext: {
            event: "outbound_api_not_found",
            operation: GET_CERTIFICATE.operation,
            upstream_method: GET_CERTIFICATE.method,
            upstream_route: GET_CERTIFICATE.route,
            upstream_status_code: failure.status,
            duration_ms: Date.now() - startedAt,
            laa_reference: laaReference,
          },
        });
        return undefined;
      }

      logger.logError({
        functionName: "application_api_adaptor",
        message: "Certificate request failed",
        err: error,
        extraContext: {
          event: "outbound_api_request_failed",
          operation: GET_CERTIFICATE.operation,
          upstream_method: GET_CERTIFICATE.method,
          upstream_route: GET_CERTIFICATE.route,
          ...getUpstreamStatusContext(failure.status),
          failure_reason: failure.failureReason,
          retryable: failure.retryable,
          duration_ms: Date.now() - startedAt,
          laa_reference: laaReference,
        },
      });
      throw new ApplicationError(
        failure.type,
        GET_CERTIFICATE.operation,
        failure.retryable,
      );
    }
  }

  async getApplicationHistory(
    laaReference: string,
    accessToken: string | undefined,
  ): Promise<HistoryEvent[]> {
    return await getApplicationHistory({
      http: this.http,
      baseUrl: this.baseUrl,
      laaReference,
      accessToken,
    });
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
    laaReference: string,
    accessToken: string | undefined,
    publicBodyIds: string[],
  ): Promise<void> {
    const payload: { publicBodies: string[] } = {
      publicBodies: publicBodyIds,
    };

    await patchInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${laaReference}/public-bodies`,
      body: payload,
      accessToken,
    });
  }

  async addHistoryNote(
    laaReference: string,
    accessToken: string | undefined,
    noteText: string,
  ): Promise<void> {
    const startedAt = Date.now();
    await postInquestsApi({
      http: this.http,
      baseUrl: this.baseUrl,
      path: `/applications/${laaReference}/note`,
      body: { noteText },
      accessToken,
    });
    logger.logInfo({
      functionName: "application_api_adaptor",
      message: "History note submitted upstream",
      extraContext: {
        event: "outbound_api_call",
        route: "/applications/:id/note",
        laa_reference: laaReference,
        duration_ms: Date.now() - startedAt,
      },
    });
  }
}

function mapApplicationStatusForDisplay(status: string | null): string | null {
  if (!status) {
    return status;
  }

  return (APPLICATION_STATUSES as Record<string, string>)[status] ?? status;
}
