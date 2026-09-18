import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response, NextFunction } from "express";
import { globalAccessGuard } from "#src/infrastructure/express/middleware/accessControl/globalAccessGuard.js";
import {
  INTERNAL_CASEWORKER_ROLES,
  ROUTE_POLICIES,
  type RoutePolicy,
} from "#src/infrastructure/config/accessControl.js";
import { HTTP_FORBIDDEN } from "#src/infrastructure/express/constants.js";
import { initializeI18nextSync } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";

describe("globalAccessGuard", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

  before(() => {
    initializeI18nextSync();
  });

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    res.status.returns(res);
    next = sinon.stub();
    req.session = {} as any;
  });

  afterEach(() => {
    sinon.restore();
  });

  const setPath = (path: string): void => {
    (req as unknown as { path: string }).path = path;
  };

  describe("public paths", () => {
    for (const path of [
      "/health",
      "/status",
      "/auth/login",
      "/auth/callback",
    ]) {
      it(`allows unauthenticated access to ${path}`, () => {
        setPath(path);

        globalAccessGuard(req, res, next as NextFunction);

        assert.equal(next.callCount, 1);
        assert.equal(res.status.callCount, 0);
      });
    }
  });

  describe("unauthenticated requests to non-public paths", () => {
    it("calls next() and defers to requireAuth", () => {
      setPath("/applications");

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
      assert.equal(res.status.callCount, 0);
    });

    it("is safe when session roles are missing", () => {
      setPath("/applications");
      req.session.user = { userId: "" };

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
    });
  });

  describe("authenticated requests", () => {
    beforeEach(() => {
      req.session.user = { userId: "test-caseworker" };
    });

    it("allows access when no route policy is configured", () => {
      setPath("/applications");

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
      assert.equal(res.status.callCount, 0);
    });

    it("is safe when session roles are missing", () => {
      setPath("/applications");

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
    });

    it("allows access when roles are present but no policy applies", () => {
      setPath("/applications");
      req.session.roles = [INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER];

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
      assert.equal(res.status.callCount, 0);
    });
  });

  describe("authenticated requests to a policy-protected dummy test route", () => {
    // Allows adding a test policy to the otherwise readonly ROUTE_POLICIES array.
    const mutableRoutePolicies = ROUTE_POLICIES as RoutePolicy[];
    const testPolicy: RoutePolicy = {
      prefix: "/test-route",
      allowedRoles: [INTERNAL_CASEWORKER_ROLES.FINANCE],
    };

    beforeEach(() => {
      setPath("/test-route");
      req.session.user = { userId: "test-caseworker" };
      mutableRoutePolicies.push(testPolicy);
    });

    afterEach(() => {
      mutableRoutePolicies.pop();
    });

    it("denies access when no session role satisfies the policy", () => {
      req.session.roles = [INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER];

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 0);
      assert.equal(res.status.callCount, 1);
      assert.equal(res.status.firstCall.args[0], HTTP_FORBIDDEN);
      assert.deepEqual(res.render.firstCall.args, [
        "main/error",
        { status: HTTP_FORBIDDEN, error: "Forbidden" },
      ]);
    });

    it("allows access when a session role satisfies the policy", () => {
      req.session.roles = [INTERNAL_CASEWORKER_ROLES.FINANCE];

      globalAccessGuard(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
      assert.equal(res.status.callCount, 0);
    });
  });

  describe("Only authenticated requests to applications overview", () => {
    beforeEach(() => {
      setPath("/applications/INQ-123-456/overview");
      req.session.user = { userId: "test-caseworker" };
    });

    it("denies access when no session role satisfies the policy", () => {
      const deniedRoles = [
        INTERNAL_CASEWORKER_ROLES.POLICY,
        INTERNAL_CASEWORKER_ROLES.FINANCE,
        INTERNAL_CASEWORKER_ROLES.CLAIM_WORKFLOW_REPORTING,
        INTERNAL_CASEWORKER_ROLES.APPLICATION_WORKFLOW_REPORTING,
      ];

      for (const role of deniedRoles) {
        req.session.roles = [role];

        globalAccessGuard(req, res, next as NextFunction);

        assert.equal(next.callCount, 0);
        assert.equal(res.status.callCount, 1);
        assert.equal(res.status.firstCall.args[0], HTTP_FORBIDDEN);
        assert.deepEqual(res.render.firstCall.args, [
          "main/error",
          { status: HTTP_FORBIDDEN, error: "Forbidden" },
        ]);
        next.resetHistory();
        res.status.resetHistory();
        res.render.resetHistory();
      }
    });

    it("allows access when a session role satisfies the policy", () => {
      const allowedRoles = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.CUSTOMER_SERVICE_AGENT,
        INTERNAL_CASEWORKER_ROLES.ASSURANCE,
      ];

      for (const role of allowedRoles) {
        req.session.roles = [role];

        globalAccessGuard(req, res, next as NextFunction);

        assert.equal(next.callCount, 1);
        assert.equal(res.status.callCount, 0);

        next.resetHistory();
        res.status.resetHistory();
      }
    });
  });
});
