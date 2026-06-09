import type { AuthPort } from "#src/ports/auth/Auth.port.js";
import type { AuthTokenResult } from "#src/adaptors/source/auth/models/Auth.types.js";

export class MockAuthAdaptor implements AuthPort {
  constructor(private readonly mockOAuthUrl: string) {}

  // eslint-disable-next-line @typescript-eslint/require-await -- mock implementation returns synchronously but must satisfy the async interface
  async getAuthCodeUrl(
    _scopes: string[],
    redirectUri: string,
  ): Promise<string> {
    const params = new URLSearchParams({ redirect_uri: redirectUri });
    return `${this.mockOAuthUrl}/authorize?${params.toString()}`;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- mock implementation returns synchronously but must satisfy the async interface
  async acquireTokenByCode(
    code: string,
    _scopes: string[],
    _redirectUri: string,
  ): Promise<AuthTokenResult> {
    return { userId: code, userName: "Test User" };
  }
}
