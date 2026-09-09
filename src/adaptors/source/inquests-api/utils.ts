import axios from "axios";
import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
} from "#src/infrastructure/express/constants.js";
import {
  UPSTREAM_AUTH_FAILURES,
  UpstreamAuthError,
} from "#src/ports/common/upstreamAuthError.js";

export function toUpstreamAuthError(
  error: unknown,
  route: string,
  method: string,
): UpstreamAuthError | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  const status = error.response?.status;
  if (status === HTTP_UNAUTHORIZED) {
    return new UpstreamAuthError(
      UPSTREAM_AUTH_FAILURES.UNAUTHENTICATED,
      route,
      method,
      { cause: error },
    );
  } else if (status === HTTP_FORBIDDEN) {
    return new UpstreamAuthError(
      UPSTREAM_AUTH_FAILURES.FORBIDDEN,
      route,
      method,
      { cause: error },
    );
  } else {
    return undefined;
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
    throw new Error("Missing access token for Inquests API request");
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
    const authError = toUpstreamAuthError(error, path, "PATCH");
    if (authError !== undefined) {
      throw authError;
    }
    throw error;
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
    throw new Error("Missing access token for Inquests API request");
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
    const authError = toUpstreamAuthError(error, path, "GET");
    if (authError !== undefined) {
      throw authError;
    }
    throw error;
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
    throw new Error("Missing access token for Inquests API request");
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
    const authError = toUpstreamAuthError(error, path, "POST");
    if (authError !== undefined) {
      throw authError;
    }
    throw error;
  }
}
