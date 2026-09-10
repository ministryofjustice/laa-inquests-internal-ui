import axios, { type AxiosResponse, type AxiosStatic } from "axios";
import type {
  Application,
  HistoryEvent,
} from "#src/adaptors/models/application.types.js";
import {
  ApplicationSchema,
  HistoryEventSchema,
} from "#src/adaptors/models/application.schema.js";
import { APPLICATION_STATUSES } from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import {
  asUnexpectedApplicationApiFailure,
  classifyApplicationApiHttpFailure,
  getUpstreamStatusContext,
} from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/applicationApiFailure.js";

interface ApplicationApiRequest {
  http: AxiosStatic;
  baseUrl: string;
  laaReference: string;
  accessToken: string | undefined;
}

interface OperationMetadata {
  operation: string;
  method: string;
  route: string;
}

const GET_APPLICATION = {
  operation: "get_application",
  method: "GET",
  route: "/applications/:id",
};

const GET_APPLICATION_HISTORY = {
  operation: "get_application_history",
  method: "GET",
  route: "/applications/:id/history",
};

const GET_CORONERS_LETTER = {
  operation: "get_coroners_letter",
  method: "GET",
  route: "/applications/:id/coroners-letter",
};

function requireAccessToken(
  accessToken: string | undefined,
  laaReference: string,
  metadata: OperationMetadata,
  startedAt: number,
): string {
  if (typeof accessToken === "string" && accessToken !== "") {
    return accessToken;
  }

  logger.logError({
    functionName: "application_api_adaptor",
    message: "Inquests API request is missing credentials",
    extraContext: {
      event: "outbound_api_request_failed",
      operation: metadata.operation,
      upstream_method: metadata.method,
      upstream_route: metadata.route,
      failure_reason: "missing_credentials",
      retryable: false,
      duration_ms: Date.now() - startedAt,
      laa_reference: laaReference,
    },
  });
  throw new ApplicationError(
    APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    metadata.operation,
    false,
  );
}

function logSuccess(
  message: string,
  laaReference: string,
  metadata: OperationMetadata,
  startedAt: number,
): void {
  logger.logInfo({
    functionName: "application_api_adaptor",
    message,
    extraContext: {
      event: "outbound_api_call",
      operation: metadata.operation,
      upstream_method: metadata.method,
      upstream_route: metadata.route,
      laa_reference: laaReference,
      duration_ms: Date.now() - startedAt,
    },
  });
}

function throwTechnicalFailure(
  error: unknown,
  message: string,
  laaReference: string,
  metadata: OperationMetadata,
  startedAt: number,
): never {
  if (error instanceof ApplicationError) {
    throw error;
  } else if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      throw error;
    }
    throw new ApplicationError(
      APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
      metadata.operation,
      false,
    );
  }

  const failure = asUnexpectedApplicationApiFailure(
    classifyApplicationApiHttpFailure(error),
  );
  logger.logError({
    functionName: "application_api_adaptor",
    message,
    err: error,
    extraContext: {
      event: "outbound_api_request_failed",
      operation: metadata.operation,
      upstream_method: metadata.method,
      upstream_route: metadata.route,
      ...getUpstreamStatusContext(failure.status),
      failure_reason: failure.failureReason,
      retryable: failure.retryable,
      duration_ms: Date.now() - startedAt,
      laa_reference: laaReference,
    },
  });
  throw new ApplicationError(
    failure.type,
    metadata.operation,
    failure.retryable,
  );
}

export async function getApplication(
  request: ApplicationApiRequest,
): Promise<Application> {
  const { http, baseUrl, laaReference } = request;
  const startedAt = Date.now();
  const accessToken = requireAccessToken(
    request.accessToken,
    laaReference,
    GET_APPLICATION,
    startedAt,
  );

  try {
    const { data }: AxiosResponse<Application> = await http.get(
      `${baseUrl}/applications/${laaReference}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const result = ApplicationSchema.safeParse(data);
    if (!result.success) {
      logger.logError({
        functionName: "application_api_adaptor",
        message: "Application response validation failed",
        extraContext: {
          event: "outbound_api_request_failed",
          operation: GET_APPLICATION.operation,
          upstream_method: GET_APPLICATION.method,
          upstream_route: GET_APPLICATION.route,
          failure_reason: "invalid_response",
          retryable: false,
          duration_ms: Date.now() - startedAt,
          laa_reference: laaReference,
        },
      });
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
        GET_APPLICATION.operation,
        false,
      );
    }

    logSuccess(
      "Application retrieved upstream",
      laaReference,
      GET_APPLICATION,
      startedAt,
    );
    return {
      ...result.data,
      status:
        (APPLICATION_STATUSES as Record<string, string>)[result.data.status] ??
        result.data.status,
    };
  } catch (error) {
    throwTechnicalFailure(
      error,
      "Application request failed",
      laaReference,
      GET_APPLICATION,
      startedAt,
    );
  }
}

export async function getApplicationHistory(
  request: ApplicationApiRequest,
): Promise<HistoryEvent[]> {
  const { http, baseUrl, laaReference } = request;
  const startedAt = Date.now();
  const accessToken = requireAccessToken(
    request.accessToken,
    laaReference,
    GET_APPLICATION_HISTORY,
    startedAt,
  );

  try {
    const { data }: AxiosResponse<HistoryEvent[]> = await http.get(
      `${baseUrl}/applications/${laaReference}/history`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const result = HistoryEventSchema.array().safeParse(data);
    if (!result.success) {
      logger.logError({
        functionName: "application_api_adaptor",
        message: "Application history response validation failed",
        extraContext: {
          event: "outbound_api_request_failed",
          operation: GET_APPLICATION_HISTORY.operation,
          upstream_method: GET_APPLICATION_HISTORY.method,
          upstream_route: GET_APPLICATION_HISTORY.route,
          failure_reason: "invalid_response",
          retryable: false,
          duration_ms: Date.now() - startedAt,
          laa_reference: laaReference,
        },
      });
      throw new ApplicationError(
        APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
        GET_APPLICATION_HISTORY.operation,
        false,
      );
    }

    logSuccess(
      "Application history retrieved upstream",
      laaReference,
      GET_APPLICATION_HISTORY,
      startedAt,
    );
    return result.data;
  } catch (error) {
    throwTechnicalFailure(
      error,
      "Application history request failed",
      laaReference,
      GET_APPLICATION_HISTORY,
      startedAt,
    );
  }
}

export async function getCoronersLetterDocument(
  request: ApplicationApiRequest,
): Promise<{ data: Buffer; contentType: string } | undefined> {
  const { http, baseUrl, laaReference } = request;
  const startedAt = Date.now();
  const accessToken = requireAccessToken(
    request.accessToken,
    laaReference,
    GET_CORONERS_LETTER,
    startedAt,
  );

  try {
    const response: AxiosResponse<ArrayBuffer> = await http.get(
      `${baseUrl}/applications/${laaReference}/coroners-letter`,
      {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    logSuccess(
      "Coroner letter document retrieved upstream",
      laaReference,
      GET_CORONERS_LETTER,
      startedAt,
    );
    const { headers, data } = response;
    const { "content-type": contentType } = headers;
    return {
      data: Buffer.from(data),
      contentType:
        typeof contentType === "string"
          ? contentType
          : "application/octet-stream",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const failure = classifyApplicationApiHttpFailure(error);
      if (failure.outcome === "NOT_FOUND") {
        logger.logWarn({
          functionName: "application_api_adaptor",
          message: "Coroner letter not found upstream",
          extraContext: {
            event: "outbound_api_not_found",
            operation: GET_CORONERS_LETTER.operation,
            upstream_method: GET_CORONERS_LETTER.method,
            upstream_route: GET_CORONERS_LETTER.route,
            upstream_status_code: failure.status,
            duration_ms: Date.now() - startedAt,
            laa_reference: laaReference,
          },
        });
        return undefined;
      }
    }

    throwTechnicalFailure(
      error,
      "Coroner letter request failed",
      laaReference,
      GET_CORONERS_LETTER,
      startedAt,
    );
  }
}
