import type { AuthTokenResult } from "#src/adaptors/source/auth/models/Auth.types.js";

export interface AuthPort {
  getAuthCodeUrl: (scopes: string[], redirectUri: string) => Promise<string>;
  acquireTokenByCode: (
    code: string,
    scopes: string[],
    redirectUri: string,
  ) => Promise<AuthTokenResult>;
}
