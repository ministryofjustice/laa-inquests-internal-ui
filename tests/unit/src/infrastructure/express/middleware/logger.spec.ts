import { strict as assert } from "assert";
import sinon from "sinon";
import type { Request } from "express";
import { stubInterface } from "ts-sinon";
import config from "#src/infrastructure/config/config.js";
import {
  getConfiguredLogLevel,
  shouldLog,
  validLogLevel,
  Logger,
} from "#src/infrastructure/express/middleware/logger/logger.js";

const now = new Date("2026-08-17T12:20:24.744Z");

describe("logger helpers", () => {
  let originalLogLevel: string | undefined;

  before(() => {
    originalLogLevel = config.LOG_LEVEL;
  });

  afterEach(() => {
    config.LOG_LEVEL = originalLogLevel;
  });

  it("falls back to info when LOG_LEVEL is missing", () => {
    config.LOG_LEVEL = undefined;
    assert.equal(getConfiguredLogLevel(), "info");
  });

  it("falls back to info when LOG_LEVEL is invalid", () => {
    config.LOG_LEVEL = "XXXX";
    assert.equal(getConfiguredLogLevel(), "info");
  });

  it("accepts a supported LOG_LEVEL", () => {
    assert.equal(validLogLevel("WARN"), true);
    config.LOG_LEVEL = "WARN";
    assert.equal(getConfiguredLogLevel(), "warn");
  });

  it("logs only when event level meets or exceeds configured threshold", () => {
    assert.equal(shouldLog("debug", "warn"), false);
    assert.equal(shouldLog("warn", "warn"), true);
    assert.equal(shouldLog("error", "warn"), true);
  });
});

describe("logger output", () => {
  let clock: sinon.SinonFakeTimers;
  let logSpy: sinon.SinonSpy;
  let warnSpy: sinon.SinonSpy;
  let errorSpy: sinon.SinonSpy;
  let debugSpy: sinon.SinonSpy;

  before(() => {
    clock = sinon.useFakeTimers(now);
    logSpy = sinon.spy(console, "log");
    warnSpy = sinon.spy(console, "warn");
    errorSpy = sinon.spy(console, "error");
    debugSpy = sinon.spy(console, "debug");
  });

  after(() => {
    logSpy.restore();
    warnSpy.restore();
    errorSpy.restore();
    debugSpy.restore();
    clock.restore();
  });

  beforeEach(() => {
    config.app.environment = "test";
    logSpy.resetHistory();
    warnSpy.resetHistory();
    errorSpy.resetHistory();
    debugSpy.resetHistory();
  });

  it("formats development logs with request and correlation IDs", () => {
    const requestStub = stubInterface<Request>();
    requestStub.headers = {
      "x-request-id": "req-123",
      "x-correlation-id": "cor-456",
    };
    const subject = new Logger("debug");

    config.app.environment = "development";
    subject.logInfo({
      functionName: "test-function",
      message: "this is a message",
      request: requestStub,
    });

    assert.equal(logSpy.callCount, 1);
    const [output] = logSpy.firstCall.args as [string];
    assert.match(
      output,
      /^\[2026-08-17T12:20:24\.744Z\] INFO test-function cor-456 req-123 this is a message$/,
    );
  });

  it("formats non-local logs as structured JSON with snake_case keys", () => {
    const requestStub = stubInterface<Request>();
    requestStub.headers = {
      "x-request-id": "req-123",
      "x-correlation-id": "cor-456",
    };
    const subject = new Logger("debug");

    config.app.environment = "prod";
    subject.logInfo({
      functionName: "test-function",
      message: "this is a message",
      request: requestStub,
      extraContext: {
        event: "journey_step_completed",
        status_code: 200,
      },
    });

    assert.equal(logSpy.callCount, 1);
    const [rawOutput] = logSpy.firstCall.args as [string];
    const output = JSON.parse(rawOutput) as Record<string, unknown>;
    assert.equal(output.level, "info");
    assert.equal(output.function_name, "test-function");
    assert.equal(output.request_id, "req-123");
    assert.equal(output.correlation_id, "cor-456");
    assert.equal(output.event, "journey_step_completed");
    assert.equal(output.status_code, 200);
  });

  it("uses request_id as correlation_id fallback when correlation header is missing", () => {
    const requestStub = stubInterface<Request>();
    requestStub.headers = {
      "x-request-id": "req-123",
    };
    const subject = new Logger("debug");

    config.app.environment = "prod";
    subject.logInfo({
      functionName: "test-function",
      message: "this is a message",
      request: requestStub,
    });

    const [rawOutput] = logSpy.firstCall.args as [string];
    const output = JSON.parse(rawOutput) as Record<string, unknown>;
    assert.equal(output.request_id, "req-123");
    assert.equal(output.correlation_id, "req-123");
  });

  it("suppresses logs below the configured threshold", () => {
    const subject = new Logger("warn");

    subject.logInfo({ functionName: "test-function", message: "info message" });
    subject.logWarn({ functionName: "test-function", message: "warn message" });

    assert.equal(logSpy.callCount, 0);
    assert.equal(warnSpy.callCount, 1);
  });

  it("emits safe error metadata without stack traces", () => {
    const requestStub = stubInterface<Request>();
    requestStub.headers = {
      "x-request-id": "req-123",
      "x-correlation-id": "cor-456",
    };
    const subject = new Logger("debug");

    config.app.environment = "prod";
    subject.logError({
      functionName: "test-function",
      message: "this is a message",
      err: new Error("typed Error"),
      request: requestStub,
    });

    assert.equal(errorSpy.callCount, 1);
    const [rawOutput] = errorSpy.firstCall.args as [string];
    const output = JSON.parse(rawOutput) as Record<string, unknown>;
    assert.equal(output.level, "error");
    assert.equal(output.message, "this is a message - Error: typed Error");
    assert.equal(output.exception_type, "Error");
    assert.equal(output.exception_message, "typed Error");
    assert.equal("stack" in output, false);
  });
});
