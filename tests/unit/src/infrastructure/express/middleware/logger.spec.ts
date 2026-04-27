import { describe, it } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { stubObject } from "ts-sinon";
import type { Request } from "express";
import config from "#src/infrastructure/config/config.js";
import type { OpenSearchLog } from "#src/infrastructure/express/middleware/logger/opensearchlog.types.js";

const functionName = "test-function";
const message = "this is a message";
const requestStub = stubObject({
  path: "/mock-data",
  session: {
    idToken: "id_123",
    userId: " user_abc",
  },
}) as unknown as Request;

const now = new Date();
let clock: sinon.SinonFakeTimers;
const expectedLog: OpenSearchLog = {
  timestamp: now.toISOString(),
  level: "",
  serviceName: config.SERVICE_NAME as string,
  environment: "development",
  correlationId: requestStub.session.idToken as string,
  message,
  context: {
    userId: requestStub.session.userId as string,
    functionName,
  },
};

describe("log", () => {
  let logSpy: sinon.SinonSpy;
  before(() => {
    logSpy = sinon.spy(console, "log");

    clock = sinon.useFakeTimers(now.getTime());
  });
  beforeEach(() => {
    config.app.environment = "test";
    logSpy.resetHistory();
  });
  after(() => {
    logSpy.restore();
    clock.restore();
  });

  it("calls console log with the enriched non-json data for development", () => {
    config.app.environment = "development";
    logger.logInfo(functionName, message, requestStub);

    const consoleArgs = logSpy.getCalls()[0].args as string[];

    assert(logSpy.calledOnce);
    assertConsoleStrings(consoleArgs);
  });

  it("calls console log with the enriched json for non-development", () => {
    config.app.environment = "prod";

    let expected = JSON.stringify({
      ...expectedLog,
      level: "info",
      environment: "prod",
    });

    logger.logInfo(functionName, message, requestStub);

    let consoleArgs = logSpy.getCalls()[0].args;

    assert(logSpy.calledOnce);
    assert.deepEqual(consoleArgs, [expected]);

    config.app.environment = "staging";

    expected = JSON.stringify({
      ...expectedLog,
      level: "info",
      environment: "staging",
    });

    logger.logInfo(functionName, message, requestStub);

    consoleArgs = logSpy.getCalls()[1].args;

    assert(logSpy.calledTwice);
    assert.deepEqual(consoleArgs, [expected]);
  });

  it("doesn't pull out the correlation or user IDs when no request", () => {
    config.app.environment = "prod";

    const expected = JSON.stringify({
      ...expectedLog,
      level: "info",
      environment: "prod",
      correlationId: "server",
      context: { ...expectedLog.context, userId: "none" },
    });

    logger.logInfo(functionName, message);

    const consoleArgs = logSpy.getCalls()[0].args;

    assert(logSpy.calledOnce);

    assert.deepEqual(consoleArgs, [expected]);
  });
});

describe("error", () => {
  let errorSpy: sinon.SinonSpy;
  before(() => {
    errorSpy = sinon.spy(console, "error");

    clock = sinon.useFakeTimers(now.getTime());
  });
  beforeEach(() => {
    config.app.environment = "test";
    errorSpy.resetHistory();
  });
  after(() => {
    errorSpy.restore();
    clock.restore();
  });
  it("calls console log with the enriched non-json data for development", () => {
    config.app.environment = "development";
    logger.logError(functionName, message, "", requestStub);
    assert(errorSpy.calledOnce);

    const consoleArgs = errorSpy.getCalls()[0].args as string[];
    assertConsoleStrings(consoleArgs);
  });

  it("calls console log with the enriched json for non-development with string error", () => {
    config.app.environment = "prod";
    let errorMessage = "string error";
    logger.logError(functionName, message, errorMessage, requestStub);

    let consoleArgs = errorSpy.getCalls()[0].args;

    assert(errorSpy.calledOnce);

    let expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: ${errorMessage}`,
      environment: "prod",
    });

    assert.deepEqual(consoleArgs, [expected]);

    config.app.environment = "staging";
    errorMessage = "string error";
    logger.logError(functionName, message, errorMessage, requestStub);

    consoleArgs = errorSpy.getCalls()[1].args;

    assert(errorSpy.calledTwice);

    expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: ${errorMessage}`,
      environment: "staging",
    });

    assert.deepEqual(consoleArgs, [expected]);
  });

  it("calls console log with the enriched json for non-development with typed error", () => {
    config.app.environment = "prod";
    let errorMessage = new Error("typed Error");
    logger.logError(functionName, message, errorMessage, requestStub);

    let consoleArgs = errorSpy.getCalls()[0].args;

    assert(errorSpy.calledOnce);

    let expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: ${errorMessage.message}`,
      environment: "prod",
    });
    assert.deepEqual(consoleArgs, [expected]);

    config.app.environment = "staging";
    errorMessage = new Error("typed Error");
    logger.logError(functionName, message, errorMessage, requestStub);

    consoleArgs = errorSpy.getCalls()[1].args;

    assert(errorSpy.calledTwice);

    expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: ${errorMessage.message}`,
      environment: "staging",
    });
    assert.deepEqual(consoleArgs, [expected]);
  });
  it("calls console log with the enriched json for non-development with unknown error", () => {
    config.app.environment = "prod";
    let errorMessage = null;
    logger.logError(functionName, message, errorMessage, requestStub);

    let consoleArgs = errorSpy.getCalls()[0].args;

    assert(errorSpy.calledOnce);

    let expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: Missing Error Message`,
      environment: "prod",
    });
    assert.deepEqual(consoleArgs, [expected]);

    config.app.environment = "staging";
    errorMessage = null;
    logger.logError(functionName, message, errorMessage, requestStub);

    consoleArgs = errorSpy.getCalls()[1].args;

    assert(errorSpy.calledTwice);

    expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: Missing Error Message`,
      environment: "staging",
    });
    assert.deepEqual(consoleArgs, [expected]);
  });

  it("doesn't pull out the correlation or user IDs when no request", () => {
    config.app.environment = "prod";
    const errorMessage = "string error";
    logger.logError(functionName, message, errorMessage);

    const consoleArgs = errorSpy.getCalls()[0].args;

    assert(errorSpy.calledOnce);

    const expected = JSON.stringify({
      ...expectedLog,
      level: "error",
      message: `${message} - Error: ${errorMessage}`,
      environment: "prod",
      correlationId: "server",
      context: { ...expectedLog.context, userId: "none" },
    });
    assert.deepEqual(consoleArgs, [expected]);
  });
});

function assertConsoleStrings(consoleArgs: string[]): void {
  assert.include(consoleArgs.join(), now.toISOString());
  assert.include(consoleArgs.join(), `[Function: '${functionName}']`);
  assert.include(consoleArgs.join(), `[CorID: ${requestStub.session.idToken}]`);
  assert.include(consoleArgs.join(), `[UserId: ${requestStub.session.userId}]`);
  assert.include(consoleArgs.join(), message);
}
