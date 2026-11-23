import sinon from "sinon";
import { type StubbedInstance, stubInterface } from "ts-sinon";
import assert from "assert";
import { cacheControl } from "#src/infrastructure/express/middleware/cacheControl/cacheControl.js";
import type { Request, Response } from "express";

describe("cacheControl", () => {
  let req: StubbedInstance<Request> = stubInterface<Request>();
  let res: StubbedInstance<Response> = stubInterface<Response>();
  let next: sinon.SinonStub = sinon.stub();

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    next = sinon.stub();
  });

  it("calls next", () => {
    cacheControl(req, res, next);
    assert.equal(next.callCount, 1);
  });

  it("sets Cache-Control: no-store", () => {
    cacheControl(req, res, next);
    assert(res.setHeader.calledWith("Cache-Control", "no-store"));
  });

  it("sets Pragma: no-cache", () => {
    cacheControl(req, res, next);
    assert(res.setHeader.calledWith("Pragma", "no-cache"));
  });
});
