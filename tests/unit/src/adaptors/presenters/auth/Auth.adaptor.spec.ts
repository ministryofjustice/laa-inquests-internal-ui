import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { AuthAdaptor } from "#src/adaptors/presenter/auth/Auth.adaptor.js";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";

const REDIRECT_URI = "http://localhost:3000/auth/callback";
const POST_LOGOUT_URI = "http://localhost:3000";

describe("AuthAdaptor", () => {
  let authPort: StubbedInstance<AuthPort>;
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let adaptor: AuthAdaptor;

  beforeEach(() => {
    authPort = stubInterface<AuthPort>();
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    req.session = { save: sinon.stub().callsArg(0) } as any;
    adaptor = new AuthAdaptor(authPort, REDIRECT_URI, POST_LOGOUT_URI);
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

      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], authUrl);
    });

    it("propagates error when auth port throws", async () => {
      authPort.getAuthCodeUrl.rejects(new Error("auth port failure"));

      await assert.rejects(() => adaptor.login(req, res), /auth port failure/);
    });
  });

  describe("callback", () => {
    it("stores userId in session and redirects to /", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.resolves({ userId: "user-oid-abc" });

      await adaptor.callback(req, res);

      assert.equal(req.session["userId"], "user-oid-abc");
      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], "/");
    });

    it("propagates error when auth port throws on callback", async () => {
      req.query = { code: "auth-code-123" } as any;
      authPort.acquireTokenByCode.rejects(new Error("token exchange failed"));

      await assert.rejects(
        () => adaptor.callback(req, res),
        /token exchange failed/,
      );
    });
  });

  describe("logout", () => {
    it("destroys session and redirects to post logout URI", () => {
      req.session.destroy = sinon.stub().callsArg(0) as any;

      adaptor.logout(req, res);

      assert.equal(
        (req.session.destroy as sinon.SinonStub).callCount,
        1,
      );
      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], POST_LOGOUT_URI);
    });
  });
});
