import { strict as assert } from "assert";
import express from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import type { NextFunction, Request, Response } from "express";
import { createReportsRouter } from "#src/infrastructure/express/routes/reports.router.js";
import type { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";

describe("createReportsRouter", () => {
  it("registers GET / route", () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
    const route = (
      router as unknown as { stack: Array<{ route?: { path: string } }> }
    ).stack.find((layer) => layer.route?.path === "/")?.route;

    assert.notEqual(route, undefined);
  });

  it("delegates GET / handler to reports adaptor", () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
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

    assert.equal(reportsAdaptor.renderReportsPage.callCount, 1);
    assert.deepEqual(reportsAdaptor.renderReportsPage.firstCall.args, [
      req,
      res,
    ]);
    assert.equal(next.callCount, 0);
  });

  it("calls next with error when adaptor throws", () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
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
    const error = new Error("reports failed");

    reportsAdaptor.renderReportsPage.throws(error);

    route?.stack[0].handle(req, res, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });

  it("registers GET /applications/backlog route", () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
    const route = (
      router as unknown as { stack: Array<{ route?: { path: string } }> }
    ).stack.find(
      (layer) => layer.route?.path === "/applications/backlog",
    )?.route;

    assert.notEqual(route, undefined);
  });

  it("delegates GET /applications/backlog handler to reports adaptor", async () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
    const route = (
      router as unknown as {
        stack: Array<{
          route?: {
            path: string;
            stack: Array<{
              handle: (
                req: Request,
                res: Response,
                next: NextFunction,
              ) => Promise<void>;
            }>;
          };
        }>;
      }
    ).stack.find(
      (layer) => layer.route?.path === "/applications/backlog",
    )?.route;
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();

    await route?.stack[0].handle(req, res, next);

    assert.equal(reportsAdaptor.downloadApplicationsBacklog.callCount, 1);
    assert.deepEqual(
      reportsAdaptor.downloadApplicationsBacklog.firstCall.args,
      [req, res],
    );
    assert.equal(next.callCount, 0);
  });

  it("calls next when backlog download handler throws", async () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
    const route = (
      router as unknown as {
        stack: Array<{
          route?: {
            path: string;
            stack: Array<{
              handle: (
                req: Request,
                res: Response,
                next: NextFunction,
              ) => Promise<void>;
            }>;
          };
        }>;
      }
    ).stack.find(
      (layer) => layer.route?.path === "/applications/backlog",
    )?.route;
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();
    const error = new Error("backlog failed");

    reportsAdaptor.downloadApplicationsBacklog.rejects(error);

    await route?.stack[0].handle(req, res, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });
});
