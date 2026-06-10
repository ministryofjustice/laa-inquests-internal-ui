import { http, HttpResponse } from "msw";

const AUTH_DIRECTORY_URL =
  process.env.AUTH_DIRECTORY_URL ??
  "https://login.microsoftonline.com/test-tenant-id";

export const authHandlers = [
  http.get(`${AUTH_DIRECTORY_URL}/v2.0/.well-known/openid-configuration`, () =>
    HttpResponse.json({
      issuer: `${AUTH_DIRECTORY_URL}/v2.0`,
      authorization_endpoint: `${AUTH_DIRECTORY_URL}/oauth2/v2.0/authorize`,
      token_endpoint: `${AUTH_DIRECTORY_URL}/oauth2/v2.0/token`,
      jwks_uri: `${AUTH_DIRECTORY_URL}/discovery/v2.0/keys`,
    }),
  ),

  http.post(`${AUTH_DIRECTORY_URL}/oauth2/v2.0/token`, () =>
    HttpResponse.json({
      access_token: "mock-access-token",
      id_token: "mock-id-token",
      token_type: "Bearer",
      expires_in: 3600,
    }),
  ),
];
