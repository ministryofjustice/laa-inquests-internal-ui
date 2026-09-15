import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response, NextFunction } from "express";
import { globalAccessGuard } from "#src/infrastructure/express/middleware/accessControl/globalAccessGuard.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

describe("globalAccessGuard", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

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
});
