import { strict as assert } from "assert";
import express from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import type { NextFunction, Request, Response } from "express";
import { createUserRolesRouter } from "#src/infrastructure/express/routes/userRoles.router.js";
import type { UserRolesAdaptor } from "#src/adaptors/presenter/userRoles/UserRoles.adaptor.js";

describe("createUserRolesRouter", () => {
  it("registers GET / route", () => {
    const userRolesAdaptor = stubInterface<UserRolesAdaptor>();
    const router = createUserRolesRouter(express.Router(), userRolesAdaptor);
    const route = (
      router as unknown as { stack: Array<{ route?: { path: string } }> }
    ).stack.find((layer) => layer.route?.path === "/")?.route;

    assert.notEqual(route, undefined);
  });

  it("delegates GET / handler to userRoles adaptor", () => {
    const userRolesAdaptor = stubInterface<UserRolesAdaptor>();
    const router = createUserRolesRouter(express.Router(), userRolesAdaptor);
    const route = (
      router as unknown as {
        stack: Array<{
          route?: {
            path: string;
            stack: Array<{
              handle: (req: Request, res: Response, next: NextFunction) => void;
            }>;
          };
        }>;
      }
    ).stack.find((layer) => layer.route?.path === "/")?.route;
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();

    route?.stack[0].handle(req, res, next);

    assert.equal(userRolesAdaptor.renderUserRolesPage.callCount, 1);
    assert.deepEqual(userRolesAdaptor.renderUserRolesPage.firstCall.args, [
      req,
      res,
    ]);
    assert.equal(next.callCount, 0);
  });

  it("calls next with error when adaptor throws", () => {
    const userRolesAdaptor = stubInterface<UserRolesAdaptor>();
    const router = createUserRolesRouter(express.Router(), userRolesAdaptor);
    const route = (
      router as unknown as {
        stack: Array<{
          route?: {
            path: string;
            stack: Array<{
              handle: (req: Request, res: Response, next: NextFunction) => void;
            }>;
          };
        }>;
      }
    ).stack.find((layer) => layer.route?.path === "/")?.route;
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();
    const error = new Error("user roles failed");

    userRolesAdaptor.renderUserRolesPage.throws(error);

    route?.stack[0].handle(req, res, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });
});
