import { strict as assert } from "assert";
import type { Request, Response } from "express";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import { setupNavigationData } from "#src/infrastructure/express/middleware/nunjucks/setupNavigationData.js";

describe("setupNavigationData", () => {
  it("exposes the cookies link with the encoded current page and continues the request", () => {
    const req = stubInterface<Request>();
    const res = stubInterface<Response>();
    const next = sinon.stub();
    req.originalUrl = "/reports";
    res.locals = {};

    setupNavigationData(req, res, next);

    assert.equal(res.locals.cookiesHref, "/cookies?returnTo=%2Freports");
    sinon.assert.calledOnceWithExactly(next);
  });
});
