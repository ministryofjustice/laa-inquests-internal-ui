import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";

interface PatchInquestsApiParams<TBody> {
  http: AxiosInstance;
  baseUrl: string;
  path: string;
  body: TBody;
  accessToken: string | undefined;
  headers?: Record<string, string>;
}

interface GetInquestApiParams {
  http: AxiosInstance;
  baseUrl: string;
  path: string;
  accessToken: string | undefined;
  headers?: Record<string, string>;
  axiosConfig?: Omit<AxiosRequestConfig, "headers">;
}

export async function patchInquestsApi<TResponse, TBody>(
  params: PatchInquestsApiParams<TBody>,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, body, accessToken, headers } = params;

  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("Missing access token for Inquests API request");
  }

  return await http.patch<TResponse>(`${baseUrl}${path}`, body, {
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getInquestsApi<TResponse>(
  params: GetInquestApiParams,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, accessToken, headers, axiosConfig } = params;

  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("Missing access token for Inquests API request");
  }

  return await http.get<TResponse>(`${baseUrl}${path}`, {
    ...axiosConfig,
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
