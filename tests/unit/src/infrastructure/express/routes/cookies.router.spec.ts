import { strict as assert } from "assert";
import express from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import type { NextFunction, Request, Response } from "express";
import { createCookiesRouter } from "#src/infrastructure/express/routes/cookies.router.js";
import type { CookiesAdaptor } from "#src/adaptors/presenter/cookies/Cookies.adaptor.js";

describe("createCookiesRouter", () => {
  it("registers GET / route", () => {
    const cookiesAdaptor = stubInterface<CookiesAdaptor>();
    const router = createCookiesRouter(express.Router(), cookiesAdaptor);
    const route = (
      router as unknown as { stack: Array<{ route?: { path: string } }> }
    ).stack.find((layer) => layer.route?.path === "/")?.route;

    assert.notEqual(route, undefined);
  });

  it("delegates GET / handler to cookies adaptor", () => {
    const cookiesAdaptor = stubInterface<CookiesAdaptor>();
    const router = createCookiesRouter(express.Router(), cookiesAdaptor);
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

    assert.equal(cookiesAdaptor.renderCookiesPage.callCount, 1);
    assert.deepEqual(cookiesAdaptor.renderCookiesPage.firstCall.args, [
      req,
      res,
    ]);
    assert.equal(next.callCount, 0);
  });

  it("calls next with error when adaptor throws", () => {
    const cookiesAdaptor = stubInterface<CookiesAdaptor>();
    const router = createCookiesRouter(express.Router(), cookiesAdaptor);
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
    const error = new Error("cookies failed");

    cookiesAdaptor.renderCookiesPage.throws(error);

    route?.stack[0].handle(req, res, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });
});
