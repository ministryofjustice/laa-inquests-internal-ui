import { strict as assert } from "assert";
import sinon from "sinon";
import type { NextFunction, Request, Response } from "express";
import { stubInterface } from "ts-sinon";
import config from "#src/infrastructure/config/config.js";
import { Logger } from "#src/infrastructure/logging/logger.js";
import { requestLoggingContext } from "#src/infrastructure/express/middleware/requestLoggingContext.js";

describe("requestLoggingContext", () => {
  const originalEnvironment = config.app.environment;

  afterEach(() => {
    config.app.environment = originalEnvironment;
    sinon.restore();
  });

  it("makes request headers available to logs without passing the request", () => {
    const request = stubInterface<Request>();
    const response = stubInterface<Response>();
    const logger = new Logger("debug");
    const logSpy = sinon.spy(console, "log");
    request.headers = {
      "x-request-id": "req-123",
      "x-correlation-id": "cor-456",
    };
    config.app.environment = "prod";

    const next = sinon.spy(() => {
      logger.logInfo({
        functionName: "test-function",
        message: "this is a message",
      });
    });

    requestLoggingContext(
      request as unknown as Request,
      response as unknown as Response,
      next as unknown as NextFunction,
    );

    assert.equal(next.callCount, 1);
    const [rawOutput] = logSpy.firstCall.args as [string];
    const output = JSON.parse(rawOutput) as Record<string, unknown>;
    assert.equal(output.request_id, "req-123");
    assert.equal(output.correlation_id, "cor-456");
  });

  it("generates a shared non-empty ID when headers have no value", () => {
    const request = stubInterface<Request>();
    const response = stubInterface<Response>();
    const logger = new Logger("debug");
    const logSpy = sinon.spy(console, "log");
    request.headers = {
      "x-request-id": "",
      "x-correlation-id": [],
    };
    config.app.environment = "prod";

    const next = sinon.spy(() => {
      logger.logInfo({
        functionName: "test-function",
        message: "this is a message",
      });
    });

    requestLoggingContext(
      request as unknown as Request,
      response as unknown as Response,
      next as unknown as NextFunction,
    );

    const [rawOutput] = logSpy.firstCall.args as [string];
    const output = JSON.parse(rawOutput) as Record<string, unknown>;
    assert.notEqual(output.request_id, "");
    assert.equal(output.correlation_id, output.request_id);
  });
});
