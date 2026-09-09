import axios from "axios";
import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

export function translateInquestsApiError(
  error: unknown,
  operation: string,
): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      operation,
      true,
    );
  }

  const status = error.response?.status;
  if (status === 401) {
    return new ApplicationError(
      APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
      operation,
      false,
    );
  } else if (status === 403) {
    return new ApplicationError(
      APPLICATION_ERROR_KINDS.FORBIDDEN,
      operation,
      false,
    );
  } else if (status !== undefined && status >= 500) {
    return new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
      operation,
      true,
    );
  } else {
    return new ApplicationError(
      APPLICATION_ERROR_KINDS.UPSTREAM_REJECTED,
      operation,
      false,
    );
  }
}

interface PostInquestsApiParams<TBody> {
  http: AxiosInstance;
  baseUrl: string;
  path: string;
  body: TBody;
  accessToken: string | undefined;
  axiosConfig?: AxiosRequestConfig;
}

interface PatchInquestsApiParams<TBody> {
  http: AxiosInstance;
  baseUrl: string;
  path: string;
  body: TBody;
  accessToken: string | undefined;
  axiosConfig?: AxiosRequestConfig;
}

interface GetInquestApiParams {
  http: AxiosInstance;
  baseUrl: string;
  path: string;
  accessToken: string | undefined;
  axiosConfig?: AxiosRequestConfig;
}

export async function patchInquestsApi<TResponse, TBody>(
  params: PatchInquestsApiParams<TBody>,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, body, accessToken, axiosConfig = {} } = params;

  if (typeof accessToken !== "string" || accessToken === "") {
    logger.logError({
      functionName: "patch_inquests_api",
      message: "Missing access token for Inquests API request",
      extraContext: {
        event: "outbound_api_missing_access_token",
        route: path,
      },
    });
    throw new ApplicationError(
      APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
      path,
      false,
    );
  }

  const { headers: axiosHeaders, ...restConfig } = axiosConfig;
  const headerRecord: Record<string, string> = axiosHeaders
    ? (axiosHeaders as Record<string, string>)
    : {};

  try {
    return await http.patch<TResponse>(`${baseUrl}${path}`, body, {
      ...restConfig,
      headers: { ...headerRecord, Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    logger.logError({
      functionName: "patch_inquests_api",
      message: "PATCH request to Inquests API failed",
      err: error,
      extraContext: {
        event: "outbound_api_request_failed",
        method: "PATCH",
        route: path,
      },
    });
    throw translateInquestsApiError(error, path);
  }
}

export async function getInquestsApi<TResponse>(
  params: GetInquestApiParams,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, accessToken, axiosConfig = {} } = params;
  if (typeof accessToken !== "string" || accessToken === "") {
    logger.logError({
      functionName: "get_inquests_api",
      message: "Missing access token for Inquests API request",
      extraContext: {
        event: "outbound_api_missing_access_token",
        route: path,
      },
    });
    throw new ApplicationError(
      APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
      path,
      false,
    );
  }

  const { headers: axiosHeaders, ...restConfig } = axiosConfig;
  const headerRecord: Record<string, string> = axiosHeaders
    ? (axiosHeaders as Record<string, string>)
    : {};

  try {
    return await http.get<TResponse>(`${baseUrl}${path}`, {
      ...restConfig,
      headers: { ...headerRecord, Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    logger.logError({
      functionName: "get_inquests_api",
      message: "GET request to Inquests API failed",
      err: error,
      extraContext: {
        event: "outbound_api_request_failed",
        method: "GET",
        route: path,
      },
    });
    throw translateInquestsApiError(error, path);
  }
}

export async function postInquestsApi<TResponse, TBody>(
  params: PostInquestsApiParams<TBody>,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, body, accessToken, axiosConfig = {} } = params;

  if (typeof accessToken !== "string" || accessToken === "") {
    logger.logError({
      functionName: "post_inquests_api",
      message: "Missing access token for Inquests API request",
      extraContext: {
        event: "outbound_api_missing_access_token",
        route: path,
      },
    });
    throw new ApplicationError(
      APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
      path,
      false,
    );
  }

  const { headers: axiosHeaders, ...restConfig } = axiosConfig;
  const headerRecord: Record<string, string> = axiosHeaders
    ? (axiosHeaders as Record<string, string>)
    : {};

  try {
    return await http.post<TResponse>(`${baseUrl}${path}`, body, {
      ...restConfig,
      headers: { ...headerRecord, Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    logger.logError({
      functionName: "post_inquests_api",
      message: "POST request to Inquests API failed",
      err: error,
      extraContext: {
        event: "outbound_api_request_failed",
        method: "POST",
        route: path,
      },
    });
    throw translateInquestsApiError(error, path);
  }
}
