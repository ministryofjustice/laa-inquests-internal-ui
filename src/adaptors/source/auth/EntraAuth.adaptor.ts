import type {
  ConfidentialClientApplication,
  AuthorizationCodeRequest,
  AuthenticationResult,
} from "@azure/msal-node";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";
import type { AuthTokenResult } from "#src/adaptors/source/auth/models/Auth.types.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

export class EntraAuthAdaptor implements AuthPort {
  constructor(private readonly msalClient: ConfidentialClientApplication) {}

  async getAuthCodeUrl(scopes: string[], redirectUri: string): Promise<string> {
    const authCodeUrl = await this.msalClient
      .getAuthCodeUrl({
        scopes,
        redirectUri,
      })
      .catch((error: unknown) => {
        logger.logError({
          functionName: "entra_auth_adaptor",
          message: "Auth code URL generation failed",
          err: error,
          extraContext: { event: "auth_token_acquisition_failed" },
        });
        throw new ApplicationError(
          APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
          "auth_code_url",
          true,
        );
      });
    logger.logInfo({
      functionName: "entra_auth_adaptor",
      message: "Auth code URL generated",
      extraContext: {
        event: "auth_code_url_generated",
        scope_count: scopes.length,
      },
    });

    return authCodeUrl;
  }

  async acquireTokenByCode(
    code: string,
    scopes: string[],
    redirectUri: string,
  ): Promise<AuthTokenResult> {
    const request: AuthorizationCodeRequest = { code, scopes, redirectUri };
    const result = await this.msalClient
      .acquireTokenByCode(request)
      .catch((error: unknown): AuthenticationResult | null => {
        logger.logError({
          functionName: "entra_auth_adaptor",
          message: "Token acquisition failed",
          err: error,
          extraContext: { event: "auth_token_acquisition_failed" },
        });
        throw new ApplicationError(
          APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
          "auth_token_acquisition",
          true,
        );
      });
    if (result === null) {
      logger.logError({
        functionName: "entra_auth_adaptor",
        message: "Token acquisition returned null",
        extraContext: {
          event: "auth_token_acquisition_failed",
          reason: "msal_null_result",
        },
      });
      throw new ApplicationError(
        APPLICATION_ERROR_KINDS.INVALID_UPSTREAM_RESPONSE,
        "auth_token_acquisition",
        false,
      );
    }

    logger.logInfo({
      functionName: "entra_auth_adaptor",
      message: "Token acquired",
      extraContext: {
        event: "auth_token_acquired",
        has_account: result.account !== null,
        has_access_token:
          typeof result.accessToken === "string" && result.accessToken !== "",
      },
    });

    return {
      userId: result.account?.homeAccountId ?? result.uniqueId,
      userName: result.account?.name ?? undefined,
      ...this.#getAccessTokenField(result),
      ...this.#getExpiryField(result),
    };
  }

  #getExpiryField(
    result: AuthenticationResult,
  ): Pick<AuthTokenResult, "accessTokenExpiresOn"> | Record<string, never> {
    if (result.expiresOn instanceof Date) {
      return { accessTokenExpiresOn: result.expiresOn };
    }
    return {};
  }

  #getAccessTokenField(
    result: AuthenticationResult,
  ): Pick<AuthTokenResult, "accessToken"> | Record<string, never> {
    if (typeof result.accessToken === "string" && result.accessToken !== "") {
      return { accessToken: result.accessToken };
    }
    return {};
  }
}
