import config from "#src/infrastructure/config/config.js";
import type { Request } from "express";
import type {
  LogLevel,
  OpenSearchLog,
} from "#src/infrastructure/express/middleware/logger/opensearchlog.types.js";
import { isAxiosError } from "axios";
import { isAxiosErrResponse } from "#src/infrastructure/express/middleware/errors/errors.types.js";
import type { TypedRequestBody } from "#src/infrastructure/express/api.types.js";

class Logger {
  public logInfo = (
    functionName: string,
    message: string,
    request?: Request | TypedRequestBody<unknown>,
  ): void => {
    const correlationId = request
      ? (request.session.idToken as string | undefined)?.substring(0, 36)
      : "server";
    const userId = request
      ? (request.session.userId as string | undefined)
      : undefined;
    console.log(
      buildMessage(functionName, message, "info", correlationId, userId),
    );
  };

  public logError = (
    functionName: string,
    message: string,
    err?: unknown,
    request?: Request | TypedRequestBody<unknown>,
  ): void => {
    const correlationId = request
      ? (request.session.idToken as string | undefined)?.substring(0, 36)
      : "server";
    const userId = request
      ? (request.session.userId as string | undefined)
      : undefined;

    console.error(
      buildMessage(
        functionName,
        `${message} - Error: ${this.#getErrorMessage(err)}`,
        "error",
        correlationId,
        userId,
      ),
    );
  };

  #getErrorMessage(err: unknown): string {
    if (typeof err === "string") {
      return err;
    } else if (isAxiosError(err)) {
      if (isAxiosErrResponse(err.response)) {
        return `CODE: ${err.code} - ${err.response.data}`;
      }
      return `CODE: ${err.code}`;
    } else if (err instanceof Error) {
      return err.message;
    } else {
      return "Missing Error Message";
    }
  }
}

function buildMessage(
  functionName: string,
  message: string,
  logLevel: LogLevel,
  correlationId: string | undefined,
  userId?: string,
): string | OpenSearchLog {
  if (config.app.environment === "prod") {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: logLevel,
      serviceName: config.SERVICE_NAME,
      environment: config.app.environment,
      correlationId,
      message,
      context: {
        userId: userId ?? "none",
        functionName,
      },
    });
  }

  return `[${new Date().toISOString()}] - ${logLevel.toUpperCase()} - [Function: '${functionName}'] - [CorID: ${correlationId}] - ${userId ? `[UserId: ${userId}] -` : ""} ${message}`;
}

export const logger = new Logger();
export { Logger };
