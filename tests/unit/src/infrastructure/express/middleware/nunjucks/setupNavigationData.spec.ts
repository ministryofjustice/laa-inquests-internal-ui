import { strict as assert } from "assert";
import type { Request, Response } from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import { setupNavigationData } from "#src/infrastructure/express/middleware/nunjucks/setupNavigationData.js";

describe("setupNavigationData", () => {
  it("sets the returnTo session value for non-cookies pages", () => {
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();
    req.originalUrl = "/reports";
    req.session = {} as any;
    res.locals = {};
    req.method = "GET";

    setupNavigationData(req, res, next);

    assert.equal(req.session.returnTo, "/reports");
    sinon.assert.calledOnceWithExactly(next);
  });
});
