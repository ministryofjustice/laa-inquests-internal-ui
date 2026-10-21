import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response, NextFunction } from "express";
import { AuthAdaptor } from "#src/adaptors/presenter/auth/Auth.adaptor.js";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";
import config from "#src/infrastructure/config/config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { SESSION_IDLE_TIMEOUT_MS } from "#src/infrastructure/locales/constants.js";

const REDIRECT_URI = "http://localhost:3000/auth/callback";
const POST_LOGOUT_URI = "http://localhost:3000";
const AUTH_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "api://test-api-client-id/User.Caseworker",
];

describe("AuthAdaptor", () => {
  let authPort: StubbedInstance<AuthPort>;
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;
  let adaptor: AuthAdaptor;

  beforeEach(() => {
    authPort = stubInterface<AuthPort>();
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    res.status.returns(res);
    next = sinon.stub();
    req.session = {} as any;
    adaptor = new AuthAdaptor(
      authPort,
      REDIRECT_URI,
      POST_LOGOUT_URI,
      AUTH_SCOPES,
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("login", () => {
    it("redirects to the auth code URL", async () => {
      const authUrl =
        "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize?client_id=test";
      authPort.getAuthCodeUrl.resolves(authUrl);

      await adaptor.login(req, res);
      assert.deepEqual(authPort.getAuthCodeUrl.firstCall.args[0], AUTH_SCOPES);
      assert.equal(authPort.getAuthCodeUrl.firstCall.args[1], REDIRECT_URI);
      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], authUrl);
    });

    it("propagates error when auth port throws", async () => {
      authPort.getAuthCodeUrl.rejects(new Error("auth port failure"));

      await assert.rejects(() => adaptor.login(req, res), /auth port failure/);
    });
  });

  describe("callback", () => {
    const ONE_HOUR_MS = 3_600_000;
    const BUFFER_MS = 60_000;
    const TOLERANCE_MS = 2_000;
    let regenerate: sinon.SinonStub;

    beforeEach(() => {
      req.session.cookie = {} as any;
      regenerate = sinon.stub().callsArg(0);
      req.session.regenerate = regenerate as any;
    });

    it("regenerates the session before storing the signed-in user", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() + ONE_HOUR_MS),
        roles: [],
      });
      regenerate.callsFake((cb: (err?: unknown) => void) => {
        assert.equal(req.session.user, undefined);
        cb();
      });

      await adaptor.callback(req, res);

      assert.equal(regenerate.callCount, 1);
      assert.equal(req.session.user?.userId, "user-oid-abc");
    });

    it("propagates the error and stores no user when regenerating the session fails", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() + ONE_HOUR_MS),
        roles: [],
      });
      regenerate.callsArgWith(0, new Error("store failure"));

      await assert.rejects(() => adaptor.callback(req, res), /store failure/);
      assert.equal(req.session.user, undefined);
      assert.equal(res.redirect.callCount, 0);
    });

    it("stores required data in session and redirects to /", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        userName: "Test User",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() + ONE_HOUR_MS),
        roles: ["Inquests - Claims Caseworker"],
      });

      await adaptor.callback(req, res);

      assert.equal(
        authPort.acquireTokenByCode.firstCall.args[0],
        "auth-code-123",
      );
      assert.deepEqual(
        authPort.acquireTokenByCode.firstCall.args[1],
        AUTH_SCOPES,
      );
      assert.deepEqual(req.session.user, {
        userId: "user-oid-abc",
        userName: "Test User",
        accessToken: "access-token-xyz",
      });
      assert.deepEqual(req.session.roles, ["Inquests - Claims Caseworker"]);
      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], "/");
    });

    it("stores an empty roles array in session without crashing", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        userName: "Test User",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() + ONE_HOUR_MS),
        roles: [],
      });

      await adaptor.callback(req, res);

      assert.deepEqual(req.session.roles, []);
      assert.equal(res.redirect.callCount, 1);
    });

    it("caps the session cookie maxAge at the idle timeout when the token outlives it", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        userName: "Test User",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() + ONE_HOUR_MS),
        roles: ["Inquests - Claims Caseworker"],
      });

      await adaptor.callback(req, res);

      assert.equal(req.session.cookie.maxAge, SESSION_IDLE_TIMEOUT_MS);
    });

    it("sets the session cookie maxAge to the token expiry minus the buffer when the token expires first", async () => {
      const SHORT_TOKEN_MS = 5 * BUFFER_MS;
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        userName: "Test User",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() + SHORT_TOKEN_MS),
        roles: ["Inquests - Claims Caseworker"],
      });

      await adaptor.callback(req, res);

      const maxAge = req.session.cookie.maxAge ?? 0;
      assert.ok(
        Math.abs(maxAge - (SHORT_TOKEN_MS - BUFFER_MS)) <= TOLERANCE_MS,
        `expected maxAge ~${SHORT_TOKEN_MS - BUFFER_MS}, got ${maxAge}`,
      );
    });

    it("clamps the session cookie maxAge to zero when the token has already expired", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        accessToken: "access-token-xyz",
        accessTokenExpiresOn: new Date(Date.now() - ONE_HOUR_MS),
        roles: ["Inquests - Claims Caseworker"],
      });

      await adaptor.callback(req, res);

      assert.equal(req.session.cookie.maxAge, 0);
    });

    it("throws and stores no user when the auth response has no access token expiry", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({
        userId: "user-oid-abc",
        accessToken: "access-token-xyz",
        roles: ["Inquests - Claims Caseworker"],
      });

      await assert.rejects(
        () => adaptor.callback(req, res),
        /access token expiry/i,
      );
      assert.equal(req.session.user, undefined);
      assert.equal(req.session.lifetime, undefined);
    });

    it("propagates error when auth port throws on callback", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.rejects(new Error("token exchange failed"));

      await assert.rejects(
        () => adaptor.callback(req, res),
        /token exchange failed/,
      );
    });

    it("renders a bad-request page when code is missing from query", async () => {
      req.query = {} as any;

      await adaptor.callback(req, res);

      assert.equal(authPort.acquireTokenByCode.callCount, 0);
      assert.deepEqual(res.status.firstCall.args, [400]);
      assert.deepEqual(res.render.firstCall.args, [
        "main/error",
        { status: 400, error: en.pages.error.invalidRequest },
      ]);
      assert.equal(res.redirect.callCount, 0);
    });
  });

  describe("logout", () => {
    it("destroys session, clears the session cookie and redirects to post logout URI", () => {
      req.session.destroy = sinon.stub().callsArg(0) as any;

      adaptor.logout(req, res, next as NextFunction);

      assert.equal((req.session.destroy as sinon.SinonStub).callCount, 1);
      assert.deepEqual(res.clearCookie.firstCall.args, [config.session.name]);
      assert.equal(res.redirect.callCount, 1);
      assert.equal(
        res.redirect.firstCall.args[0],
        `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_URI)}`,
      );
    });

    it("calls next with error when session destroy fails", () => {
      const destroyError = new Error("store failure");
      req.session.destroy = sinon.stub().callsArgWith(0, destroyError) as any;

      adaptor.logout(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
      assert.equal(next.firstCall.args[0], destroyError);
      assert.equal(res.redirect.callCount, 0);
    });
  });
});
