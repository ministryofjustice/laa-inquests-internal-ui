import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";

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

// COPILOT TODO: Should be logging in each of these functions
export async function patchInquestsApi<TResponse, TBody>(
  params: PatchInquestsApiParams<TBody>,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, body, accessToken, axiosConfig = {} } = params;

  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("Missing access token for Inquests API request");
  }

  const { headers: axiosHeaders, ...restConfig } = axiosConfig;
  const headerRecord: Record<string, string> = axiosHeaders
    ? (axiosHeaders as Record<string, string>)
    : {};

  return await http.patch<TResponse>(`${baseUrl}${path}`, body, {
    ...restConfig,
    headers: { ...headerRecord, Authorization: `Bearer ${accessToken}` },
  });
}

export async function getInquestsApi<TResponse>(
  params: GetInquestApiParams,
): Promise<AxiosResponse<TResponse>> {
  const { http, baseUrl, path, accessToken, axiosConfig = {} } = params;
  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("Missing access token for Inquests API request");
  }

  const { headers: axiosHeaders, ...restConfig } = axiosConfig;
  const headerRecord: Record<string, string> = axiosHeaders
    ? (axiosHeaders as Record<string, string>)
    : {};

  return await http.get<TResponse>(`${baseUrl}${path}`, {
    ...restConfig,
    headers: { ...headerRecord, Authorization: `Bearer ${accessToken}` },
  });
}
