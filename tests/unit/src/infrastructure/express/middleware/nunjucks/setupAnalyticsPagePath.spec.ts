import { strict as assert } from "assert";
import type { Request, Response } from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import { HTTP_NOT_FOUND } from "#src/infrastructure/express/constants.js";
import { setupAnalyticsPagePath } from "#src/infrastructure/express/middleware/nunjucks/setupAnalyticsPagePath.js";

describe("setupAnalyticsPagePath", () => {
  it("captures the matched mounted route at render time and removes duplicate slashes", () => {
    const req = stubInterface<Request>();
    const res: Response = stubInterface<Response>();
    const next = sinon.stub();
    const originalRender = sinon.stub();
    const options = { applicationReference: "INQ-YYY-001" };
    res.render = originalRender;
    res.locals = {};

    setupAnalyticsPagePath(req, res, next);

    sinon.assert.calledOnceWithExactly(next);
    assert.equal(res.locals.pageTemplatePath, undefined);
    req.baseUrl = "/applications/";
    req.route = { path: "/:laaReference/overview" };
    res.render("application-overview", options);

    assert.equal(
      res.locals.pageTemplatePath,
      "/applications/:laaReference/overview",
    );
    sinon.assert.calledOnceWithExactly(
      originalRender,
      "application-overview",
      options,
    );
    sinon.assert.calledOn(originalRender, res);
  });

  it("uses the request path when rendering without a matched route", () => {
    const req = stubInterface<Request>();
    const res: Response = stubInterface<Response>();
    const next = sinon.stub();
    const originalRender = sinon.stub();
    req.route = undefined;
    Object.defineProperty(req, "path", { value: "/missing-page" });
    res.render = originalRender;
    res.locals = {};

    setupAnalyticsPagePath(req, res, next);
    res.render("page-not-found");

    assert.equal(res.locals.pageTemplatePath, "/missing-page");
    sinon.assert.calledOnceWithExactly(originalRender, "page-not-found");
    sinon.assert.calledOnceWithExactly(next);
  });

  it("uses the virtual error path when rendering a 404 through the catch-all route", () => {
    const req = stubInterface<Request>();
    const res: Response = stubInterface<Response>();
    const next = sinon.stub();
    const originalRender = sinon.stub();
    req.baseUrl = "";
    req.route = { path: "{*splat}" };
    Object.defineProperty(req, "path", { value: "/missing-page" });
    res.render = originalRender;
    res.locals = {};

    setupAnalyticsPagePath(req, res, next);
    res.statusCode = HTTP_NOT_FOUND;
    res.render("main/error");

    assert.equal(res.locals.pageTemplatePath, "/errors/404");
    assert.equal(res.locals.attemptedRoute, "{*splat}");
    sinon.assert.calledOnceWithExactly(originalRender, "main/error");
    sinon.assert.calledOnceWithExactly(next);
  });
});
