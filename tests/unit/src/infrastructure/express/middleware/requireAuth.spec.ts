import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "#src/infrastructure/express/middleware/auth/requireAuth.js";

describe("requireAuth", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    next = sinon.stub();
    req.session = {} as any;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("When userId is present in session", () => {
    it("calls next", () => {
      req.session.user = { userId: "test-user-id", userName: "Test User" };

      requireAuth(req, res, next as NextFunction);

      assert.equal(next.callCount, 1);
      assert.equal(res.redirect.callCount, 0);
    });

    it("redirects to /auth/login if userId is an empty string", () => {
      req.session.user = { userId: "", userName: "Test User" };
      requireAuth(req, res, next as NextFunction);

      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], "/auth/login");
      assert.equal(next.callCount, 0);
    });
  });

  describe("When session has no userId", () => {
    it("redirects to /auth/login", () => {
      requireAuth(req, res, next as NextFunction);

      assert.equal(res.redirect.callCount, 1);
      assert.equal(res.redirect.firstCall.args[0], "/auth/login");
      assert.equal(next.callCount, 0);
    });
  });
});
