import { strict as assert } from "assert";
import express from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import type { NextFunction, Request, Response } from "express";
import { createReportsRouter } from "#src/infrastructure/express/routes/reports.router.js";
import type { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import { DATE_RANGE_REPORTS } from "#src/adaptors/presenter/reports/reportDefinitions.js";

interface RouteLayer {
  route?: {
    path: string;
    stack: Array<{
      handle: (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Promise<void> | void;
    }>;
  };
}

const findRoute = (router: express.Router, path: string): RouteLayer["route"] =>
  (router as unknown as { stack: RouteLayer[] }).stack.find(
    (layer) => layer.route?.path === path,
  )?.route;

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

    await route?.stack.at(-1)?.handle(req, res, next);

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

    await route?.stack.at(-1)?.handle(req, res, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });

  it("registers GET /claims/backlog route", () => {
    const reportsAdaptor = stubInterface<ReportsAdaptor>();
    const router = createReportsRouter(express.Router(), reportsAdaptor);
    const route = (
      router as unknown as { stack: Array<{ route?: { path: string } }> }
    ).stack.find((layer) => layer.route?.path === "/claims/backlog")?.route;

    assert.notEqual(route, undefined);
  });

  it("delegates GET /claims/backlog handler to reports adaptor", async () => {
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
    ).stack.find((layer) => layer.route?.path === "/claims/backlog")?.route;
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();

    await route?.stack.at(-1)?.handle(req, res, next);

    assert.equal(reportsAdaptor.downloadClaimsBacklog.callCount, 1);
    assert.deepEqual(reportsAdaptor.downloadClaimsBacklog.firstCall.args, [
      req,
      res,
    ]);
    assert.equal(next.callCount, 0);
  });

  it("calls next when claims backlog download handler throws", async () => {
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
    ).stack.find((layer) => layer.route?.path === "/claims/backlog")?.route;
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();
    const error = new Error("claims backlog failed");

    reportsAdaptor.downloadClaimsBacklog.rejects(error);

    await route?.stack.at(-1)?.handle(req, res, next);

    assert.equal(next.callCount, 1);
    assert.equal(next.firstCall.args[0], error);
  });

  describe("cost estimation and forecasting", () => {
    const path = "/cost-estimation-and-forecasting";

    it("delegates GET handler to reports adaptor", async () => {
      const reportsAdaptor = stubInterface<ReportsAdaptor>();
      const route = findRoute(
        createReportsRouter(express.Router(), reportsAdaptor),
        path,
      );
      const req = stubInterface<Request>();
      const res = stubInterface<Response>();
      const next = sinon.stub();

      await route?.stack.at(-1)?.handle(req, res, next);

      assert.deepEqual(reportsAdaptor.downloadCostEstimation.firstCall.args, [
        req,
        res,
      ]);
      assert.equal(next.callCount, 0);
    });

    it("applies the report rate limiter before the handler", () => {
      const route = findRoute(
        createReportsRouter(express.Router(), stubInterface<ReportsAdaptor>()),
        path,
      );

      assert.equal(route?.stack.length, 2);
    });

    it("calls next when the handler throws", async () => {
      const reportsAdaptor = stubInterface<ReportsAdaptor>();
      const route = findRoute(
        createReportsRouter(express.Router(), reportsAdaptor),
        path,
      );
      const next = sinon.stub();
      const error = new Error("cost estimation failed");
      reportsAdaptor.downloadCostEstimation.rejects(error);

      await route?.stack
        .at(-1)
        ?.handle(stubInterface<Request>(), stubInterface<Response>(), next);

      assert.equal(next.callCount, 1);
      assert.equal(next.firstCall.args[0], error);
    });
  });

  describe("date range reports", () => {
    for (const report of DATE_RANGE_REPORTS) {
      describe(report.key, () => {
        it(`delegates GET /${report.slug} to the report page renderer`, () => {
          const reportsAdaptor = stubInterface<ReportsAdaptor>();
          const route = findRoute(
            createReportsRouter(express.Router(), reportsAdaptor),
            `/${report.slug}`,
          );
          const req = stubInterface<Request>();
          const res = stubInterface<Response>();
          const next = sinon.stub();

          route?.stack.at(-1)?.handle(req, res, next);

          assert.deepEqual(
            reportsAdaptor.renderDateRangeReportPage.firstCall.args,
            [report, req, res],
          );
          assert.equal(next.callCount, 0);
        });

        it(`does not rate limit GET /${report.slug}`, () => {
          const route = findRoute(
            createReportsRouter(
              express.Router(),
              stubInterface<ReportsAdaptor>(),
            ),
            `/${report.slug}`,
          );

          assert.equal(route?.stack.length, 1);
        });

        it(`calls next when rendering /${report.slug} throws`, () => {
          const reportsAdaptor = stubInterface<ReportsAdaptor>();
          const route = findRoute(
            createReportsRouter(express.Router(), reportsAdaptor),
            `/${report.slug}`,
          );
          const next = sinon.stub();
          const error = new Error("render failed");
          reportsAdaptor.renderDateRangeReportPage.throws(error);

          route?.stack
            .at(-1)
            ?.handle(stubInterface<Request>(), stubInterface<Response>(), next);

          assert.equal(next.callCount, 1);
          assert.equal(next.firstCall.args[0], error);
        });

        it(`delegates GET /${report.slug}/download to the report download`, async () => {
          const reportsAdaptor = stubInterface<ReportsAdaptor>();
          const route = findRoute(
            createReportsRouter(express.Router(), reportsAdaptor),
            `/${report.slug}/download`,
          );
          const req = stubInterface<Request>();
          const res = stubInterface<Response>();
          const next = sinon.stub();

          await route?.stack.at(-1)?.handle(req, res, next);

          assert.deepEqual(
            reportsAdaptor.downloadDateRangeReport.firstCall.args,
            [report, req, res],
          );
          assert.equal(next.callCount, 0);
        });

        it(`applies the report rate limiter to GET /${report.slug}/download`, () => {
          const route = findRoute(
            createReportsRouter(
              express.Router(),
              stubInterface<ReportsAdaptor>(),
            ),
            `/${report.slug}/download`,
          );

          assert.equal(route?.stack.length, 2);
        });

        it(`calls next when the /${report.slug}/download handler throws`, async () => {
          const reportsAdaptor = stubInterface<ReportsAdaptor>();
          const route = findRoute(
            createReportsRouter(express.Router(), reportsAdaptor),
            `/${report.slug}/download`,
          );
          const next = sinon.stub();
          const error = new Error("download failed");
          reportsAdaptor.downloadDateRangeReport.rejects(error);

          await route?.stack
            .at(-1)
            ?.handle(stubInterface<Request>(), stubInterface<Response>(), next);

          assert.equal(next.callCount, 1);
          assert.equal(next.firstCall.args[0], error);
        });
      });
    }

    it("no longer registers the old /payment-extract route", () => {
      const route = findRoute(
        createReportsRouter(express.Router(), stubInterface<ReportsAdaptor>()),
        "/payment-extract",
      );

      assert.equal(route, undefined);
    });
  });
});
