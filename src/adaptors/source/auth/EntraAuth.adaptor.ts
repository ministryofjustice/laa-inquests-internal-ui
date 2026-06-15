import type {
  ConfidentialClientApplication,
  AuthorizationCodeRequest,
} from "@azure/msal-node";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";
import type { AuthTokenResult } from "#src/adaptors/source/auth/models/Auth.types.js";

export class EntraAuthAdaptor implements AuthPort {
  constructor(private readonly msalClient: ConfidentialClientApplication) {}

  async getAuthCodeUrl(scopes: string[], redirectUri: string): Promise<string> {
    return await this.msalClient.getAuthCodeUrl({ scopes, redirectUri });
  }

  async acquireTokenByCode(
    code: string,
    scopes: string[],
    redirectUri: string,
  ): Promise<AuthTokenResult> {
    const request: AuthorizationCodeRequest = { code, scopes, redirectUri };
    const result = await this.msalClient.acquireTokenByCode(request);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- MSAL can return null at runtime despite the type signature
    if (result === null) {
      throw new Error("MSAL returned null token result");
    }

    return {
      userId: result.account?.homeAccountId ?? result.uniqueId,
      userName: result.account?.name ?? undefined,
    };
  }
}
