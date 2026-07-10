import { strict as assert } from "assert";
import sinon from "sinon";
import type { NextFunction, Request, Response } from "express";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import { handleServerErrors } from "#src/infrastructure/express/middleware/errors/errors.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

describe("error middleware", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("handleServerErrors", () => {
    it("logs and renders the fallback 500 page", () => {
      const err = new Error("plain error");
      const logSpy = sinon.spy(logger, "logError");

      handleServerErrors(
        err,
        req as unknown as Request,
        res as unknown as Response,
        next as unknown as NextFunction,
      );

      assert.equal(logSpy.callCount, 1);
      assert.equal(res.render.callCount, 1);
      assert.deepEqual(res.render.firstCall.args, [
        "main/error",
        {
          status: 500,
          message: "Internal Server Error",
        },
      ]);
      assert.equal(next.callCount, 0);
    });
  });
});
