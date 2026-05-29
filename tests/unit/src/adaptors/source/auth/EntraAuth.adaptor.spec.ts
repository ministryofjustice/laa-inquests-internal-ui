import { strict as assert } from "assert";
import sinon from "sinon";
import type { ConfidentialClientApplication } from "@azure/msal-node";
import { stubInterface } from "ts-sinon";
import { EntraAuthAdaptor } from "#src/adaptors/source/auth/EntraAuth.adaptor.js";

const SCOPES = ["openid", "profile", "offline_access"];
const REDIRECT_URI = "http://localhost:3000/auth/callback";

describe("EntraAuthAdaptor", () => {
  let msalClient: ReturnType<typeof stubInterface<ConfidentialClientApplication>>;
  let adaptor: EntraAuthAdaptor;

  beforeEach(() => {
    msalClient = stubInterface<ConfidentialClientApplication>();
    adaptor = new EntraAuthAdaptor(msalClient as unknown as ConfidentialClientApplication);
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
        /MSAL network failure/,
      );
    });
  });

  describe("acquireTokenByCode", () => {
    it("returns AuthTokenResult with userId from homeAccountId", async () => {
      msalClient.acquireTokenByCode.resolves({
        account: { homeAccountId: "user-oid-123" },
      } as any);

      const result = await adaptor.acquireTokenByCode(
        "auth-code",
        SCOPES,
        REDIRECT_URI,
      );

      assert.deepEqual(result, { userId: "user-oid-123" });
      assert.ok(
        msalClient.acquireTokenByCode.calledOnceWith({
          code: "auth-code",
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
        }),
      );
    });

    it("throws when MSAL returns null", async () => {
      msalClient.acquireTokenByCode.resolves(null as any);

      await assert.rejects(
        () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
        /MSAL returned null token result/,
      );
    });

    it("propagates error when MSAL throws on acquireTokenByCode", async () => {
      msalClient.acquireTokenByCode.rejects(new Error("token endpoint error"));

      await assert.rejects(
        () => adaptor.acquireTokenByCode("auth-code", SCOPES, REDIRECT_URI),
        /token endpoint error/,
      );
    });
  });
});
