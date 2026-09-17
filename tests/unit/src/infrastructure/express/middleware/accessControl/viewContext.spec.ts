import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response, NextFunction } from "express";
import { viewContext } from "#src/infrastructure/express/middleware/accessControl/viewContext.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

describe("viewContext", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    res.locals = {};
    next = sinon.stub();
    req.session = {} as any;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("sets res.locals.userRoles to the session roles", () => {
    req.session.roles = [INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER];

    viewContext(req, res, next as NextFunction);

    assert.deepEqual(res.locals.userRoles, [
      INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
    ]);
  });

  it("sets res.locals.userRoles to an empty array when session roles are missing", () => {
    viewContext(req, res, next as NextFunction);

    assert.deepEqual(res.locals.userRoles, []);
  });

  it("sets res.locals.appRoles to the role constants", () => {
    viewContext(req, res, next as NextFunction);

    assert.deepEqual(res.locals.appRoles, INTERNAL_CASEWORKER_ROLES);
  });

  describe("hasRole", () => {
    it("returns true when the role is present", () => {
      req.session.roles = [INTERNAL_CASEWORKER_ROLES.ASSURANCE];

      viewContext(req, res, next as NextFunction);

      assert.equal(
        res.locals.hasRole(INTERNAL_CASEWORKER_ROLES.ASSURANCE),
        true,
      );
    });

    it("returns false when the role is absent", () => {
      req.session.roles = [INTERNAL_CASEWORKER_ROLES.ASSURANCE];

      viewContext(req, res, next as NextFunction);

      assert.equal(
        res.locals.hasRole(INTERNAL_CASEWORKER_ROLES.FINANCE),
        false,
      );
    });

    it("returns false when session roles are missing", () => {
      viewContext(req, res, next as NextFunction);

      assert.equal(
        res.locals.hasRole(INTERNAL_CASEWORKER_ROLES.FINANCE),
        false,
      );
    });

    it("returns true for each role the user holds", () => {
      req.session.roles = [
        INTERNAL_CASEWORKER_ROLES.ASSURANCE,
        INTERNAL_CASEWORKER_ROLES.FINANCE,
      ];

      viewContext(req, res, next as NextFunction);

      assert.equal(
        res.locals.hasRole(INTERNAL_CASEWORKER_ROLES.ASSURANCE),
        true,
      );
      assert.equal(res.locals.hasRole(INTERNAL_CASEWORKER_ROLES.FINANCE), true);
    });
  });

  it("calls next() unconditionally", () => {
    viewContext(req, res, next as NextFunction);

    assert.equal(next.callCount, 1);
  });
});
