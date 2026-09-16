import { strict as assert } from "assert";
import sinon from "sinon";
import type { ConfidentialClientApplication } from "@azure/msal-node";
import { stubInterface } from "ts-sinon";
import { EntraAuthAdaptor } from "#src/adaptors/source/auth/EntraAuth.adaptor.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const SCOPES = ["openid", "profile", "offline_access"];
const REDIRECT_URI = "http://localhost:3000/auth/callback";

describe("EntraAuthAdaptor", () => {
  let msalClient: ReturnType<
    typeof stubInterface<ConfidentialClientApplication>
  >;
  let adaptor: EntraAuthAdaptor;

  beforeEach(() => {
    msalClient = stubInterface<ConfidentialClientApplication>();
    adaptor = new EntraAuthAdaptor(
      msalClient as unknown as ConfidentialClientApplication,
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getAuthCodeUrl", () => {
    it("returns an auth code URL from MSAL", async () => {
      const expectedUrl =
        "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize?client_id=test";
      msalClient.getAuthCodeUrl.resolves(expectedUrl);

      const result = await adaptor.getAuthCodeUrl(SCOPES, REDIRECT_URI);

      assert.equal(result, expectedUrl);
      assert.ok(
        msalClient.getAuthCodeUrl.calledOnceWith({
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
        }),
      );
    });

    it("propagates error when MSAL throws on getAuthCodeUrl", async () => {
      msalClient.getAuthCodeUrl.rejects(new Error("MSAL network failure"));

      await assert.rejects(
        () => adaptor.getAuthCodeUrl(SCOPES, REDIRECT_URI),
        (error: unknown) =>
          error instanceof ApplicationError &&
          error.type === APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE &&
          error.operation === "auth_code_url",
      );
    });
  });

  describe("acquireTokenByCode", () => {
    it("returns AuthTokenResult with userId from homeAccountId and roles from LAA_APP_ROLES", async () => {
      msalClient.acquireTokenByCode.resolves({
        account: {
          homeAccountId: "user-oid-123",
          name: "Test User",
          idTokenClaims: {
            LAA_APP_ROLES: ["Inquests - Applications caseworker"],
          },
        },
      } as any);

      const result = await adaptor.acquireTokenByCode(
        "auth-code",
        SCOPES,
        REDIRECT_URI,
      );

      assert.deepEqual(result, {
        userId: "user-oid-123",
        userName: "Test User",
        roles: ["Inquests - Applications caseworker"],
      });
      assert.ok(
        msalClient.acquireTokenByCode.calledOnceWith({
          code: "auth-code",
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
        }),
      );
    });

    it("returns AuthTokenResult with undefined userName when account name is absent", async () => {
      msalClient.acquireTokenByCode.resolves({
        account: {
          homeAccountId: "user-oid-123",
          idTokenClaims: {
            LAA_APP_ROLES: ["Inquests - Applications caseworker"],
          },
        },
        uniqueId: "user-oid-123",
      } as any);

      const result = await adaptor.acquireTokenByCode(
        "auth-code",
        SCOPES,
        REDIRECT_URI,
      );

      assert.deepEqual(result, {
        userId: "user-oid-123",
        userName: undefined,
        roles: ["Inquests - Applications caseworker"],
      });
    });

    it("surfaces the token expiry from the MSAL result", async () => {
      const expiresOn = new Date("2026-09-03T12:00:00.000Z");
      msalClient.acquireTokenByCode.resolves({
        account: {
          homeAccountId: "user-oid-123",
          name: "Test User",
          idTokenClaims: {
            LAA_APP_ROLES: ["Inquests - Applications caseworker"],
          },
        },
        accessToken: "access-token-123",
        expiresOn,
      } as any);

      const result = await adaptor.acquireTokenByCode(
        "auth-code",
        SCOPES,
        REDIRECT_URI,
      );

      assert.deepEqual(result.accessTokenExpiresOn, expiresOn);
    });

    describe("Role extraction", () => {
      it("extracts recognised roles from an array-valued LAA_APP_ROLES claim", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {
              LAA_APP_ROLES: [
                "Inquests - Applications caseworker",
                "Inquests - Claims caseworker",
              ],
            },
          },
        } as any);

        const result = await adaptor.acquireTokenByCode(
          "auth-code",
          SCOPES,
          REDIRECT_URI,
        );

        assert.deepEqual(result.roles, [
          "Inquests - Applications caseworker",
          "Inquests - Claims caseworker",
        ]);
      });

      it("extracts recognised roles from a comma-separated LAA_APP_ROLES claim, trimming whitespace", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {
              LAA_APP_ROLES:
                "Inquests - Applications caseworker , Inquests - Claims caseworker",
            },
          },
        } as any);

        const result = await adaptor.acquireTokenByCode(
          "auth-code",
          SCOPES,
          REDIRECT_URI,
        );

        assert.deepEqual(result.roles, [
          "Inquests - Applications caseworker",
          "Inquests - Claims caseworker",
        ]);
      });

      it("deduplicates repeated roles in the LAA_APP_ROLES claim", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {
              LAA_APP_ROLES: [
                "Inquests - Applications caseworker",
                "Inquests - Applications caseworker",
              ],
            },
          },
        } as any);

        const result = await adaptor.acquireTokenByCode(
          "auth-code",
          SCOPES,
          REDIRECT_URI,
        );

        assert.deepEqual(result.roles, ["Inquests - Applications caseworker"]);
      });

      it("translates unknown roles in the LAA_APP_ROLES claim into a sanitized ApplicationError", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {
              LAA_APP_ROLES: [
                "Inquests - Random Role",
                "Inquests - Claims caseworker",
              ],
            },
          },
        } as any);

        await assert.rejects(
          () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
          (err: unknown) => {
            assert.ok(err instanceof ApplicationError);
            assert.equal(
              err.type,
              APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
            );
            assert.equal(err.operation, "auth_token_acquisition");
            assert.doesNotMatch(err.message, /Unknown role in token claims/);
            return true;
          },
        );
      });

      it("throws error when the LAA_APP_ROLES claim is missing", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {},
          },
        } as any);

        await assert.rejects(
          () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
          (err: unknown) => {
            assert.ok(err instanceof ApplicationError);
            assert.equal(
              err.type,
              APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
            );
            assert.equal(err.operation, "auth_token_acquisition");
            assert.doesNotMatch(err.message, /no caseworker roles/);
            return true;
          },
        );
      });

      it("throws error when the LAA_APP_ROLES claim is empty", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {
              LAA_APP_ROLES: [],
            },
          },
        } as any);

        await assert.rejects(
          () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
          (err: unknown) => {
            assert.ok(err instanceof ApplicationError);
            assert.equal(
              err.type,
              APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
            );
            assert.equal(err.operation, "auth_token_acquisition");
            assert.doesNotMatch(err.message, /no caseworker roles/);
            return true;
          },
        );
      });

      it("throws error when the LAA_APP_ROLES claim is malformed", async () => {
        msalClient.acquireTokenByCode.resolves({
          account: {
            homeAccountId: "user-oid-123",
            idTokenClaims: {
              LAA_APP_ROLES: { unexpected: 1 },
            },
          },
        } as any);

        await assert.rejects(
          () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
          (err: unknown) => {
            assert.ok(err instanceof ApplicationError);
            assert.equal(
              err.type,
              APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
            );
            assert.equal(err.operation, "auth_token_acquisition");
            assert.doesNotMatch(err.message, /no caseworker roles/);
            return true;
          },
        );
      });
    });
  });

  it("throws when MSAL returns null", async () => {
    msalClient.acquireTokenByCode.resolves(null as any);

    await assert.rejects(
      () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
      (error: unknown) =>
        error instanceof ApplicationError &&
        error.type === APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE &&
        error.operation === "auth_token_acquisition",
    );
  });

  it("propagates error when MSAL throws on acquireTokenByCode", async () => {
    msalClient.acquireTokenByCode.rejects(new Error("token endpoint error"));

    await assert.rejects(
      () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
      (error: unknown) =>
        error instanceof ApplicationError &&
        error.type === APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE &&
        error.operation === "auth_token_acquisition",
    );
  });
});
