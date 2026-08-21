import config from "#src/infrastructure/config/config.js";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import type {
  LogLevel,
  OpenSearchLog,
} from "#src/infrastructure/express/middleware/logger/opensearchlog.types.js";

export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;

const DEBUG_LEVEL_PRIORITY = 10;
const INFO_LEVEL_PRIORITY = 20;
const WARN_LEVEL_PRIORITY = 30;
const ERROR_LEVEL_PRIORITY = 40;
const FATAL_LEVEL_PRIORITY = 50;

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: DEBUG_LEVEL_PRIORITY,
  info: INFO_LEVEL_PRIORITY,
  warn: WARN_LEVEL_PRIORITY,
  error: ERROR_LEVEL_PRIORITY,
  fatal: FATAL_LEVEL_PRIORITY,
};

interface LogContext {
  requestId: string;
  correlationId: string;
}

type ExtraContext = Record<string, unknown>;

interface EmitInput {
  level: LogLevel;
  functionName: string;
  message: string;
  request?: Request;
  err?: unknown;
  extraContext?: ExtraContext;
}

interface LogInput {
  functionName: string;
  message: string;
  request?: Request;
  extraContext?: ExtraContext;
}

interface ErrorLogInput extends LogInput {
  err?: unknown;
}

interface BuildMessageInput {
  functionName: string;
  message: string;
  logLevel: LogLevel;
  context: LogContext;
  errorContext?: ExtraContext;
  extraContext?: ExtraContext;
}

export function validLogLevel(loglevel: string | undefined): boolean {
  return LOG_LEVELS.includes((loglevel ?? "").toLowerCase() as LogLevel);
}

export function getConfiguredLogLevel(): LogLevel {
  if (validLogLevel(config.LOG_LEVEL)) {
    return (config.LOG_LEVEL ?? "").toLowerCase() as LogLevel;
  }

  return "info";
}

export function shouldLog(
  eventLevel: LogLevel,
  configuredLevel: LogLevel,
): boolean {
  return LOG_LEVEL_PRIORITY[eventLevel] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

function extractContext(request: Request | undefined): LogContext {
  const requestIdHeader = request?.headers["x-request-id"];
  const correlationIdHeader = request?.headers["x-correlation-id"];
  const requestId = headerValueToString(requestIdHeader) ?? randomUUID();
  const correlationId = headerValueToString(correlationIdHeader) ?? requestId;

  return {
    requestId,
    correlationId,
  };
}

function headerValueToString(
  headerValue: string | string[] | undefined,
): string | undefined {
  if (typeof headerValue === "string") {
    return headerValue;
  }

  if (Array.isArray(headerValue)) {
    const [firstHeaderValue] = headerValue;
    return firstHeaderValue;
  }

  return undefined;
}

class Logger {
  constructor(
    private readonly configuredLogLevel: LogLevel = getConfiguredLogLevel(),
  ) {}

  public logDebug = ({
    functionName,
    message,
    request,
    extraContext,
  }: LogInput): void => {
    this.#emit({
      level: "debug",
      functionName,
      message,
      request,
      extraContext,
    });
  };

  public logInfo = ({
    functionName,
    message,
    request,
    extraContext,
  }: LogInput): void => {
    this.#emit({
      level: "info",
      functionName,
      message,
      request,
      extraContext,
    });
  };

  public logWarn = ({
    functionName,
    message,
    request,
    extraContext,
  }: LogInput): void => {
    this.#emit({
      level: "warn",
      functionName,
      message,
      request,
      extraContext,
    });
  };

  public logError = ({
    functionName,
    message,
    err,
    request,
    extraContext,
  }: ErrorLogInput): void => {
    this.#emit({
      level: "error",
      functionName,
      message,
      request,
      err,
      extraContext,
    });
  };

  #getErrorMessage(err: unknown): string {
    if (typeof err === "string") {
      return err;
    } else if (err instanceof Error) {
      return err.message;
    } else {
      return "Missing Error Message";
    }
  }

  #getErrorType(err: unknown): string {
    if (err instanceof Error && err.name !== "") {
      return err.name;
    }
    if (typeof err === "string") {
      return "StringError";
    }
    return "UnknownError";
  }

  #emit({
    level,
    functionName,
    message,
    request,
    err,
    extraContext,
  }: EmitInput): void {
    if (!shouldLog(level, this.configuredLogLevel)) {
      return;
    }

    const context = extractContext(request);
    const errorMessage =
      err === undefined ? undefined : this.#getErrorMessage(err);
    const errorContext =
      err === undefined
        ? undefined
        : {
            exception_type: this.#getErrorType(err),
            exception_message: errorMessage,
          };

    const finalMessage =
      errorMessage === undefined
        ? message
        : `${message} - Error: ${errorMessage}`;
    const output = buildMessage({
      functionName,
      message: finalMessage,
      logLevel: level,
      context,
      errorContext,
      extraContext,
    });

    if (level === "debug") {
      console.debug(output);
    } else if (level === "info") {
      console.log(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.error(output);
    }
  }
}

function buildMessage({
  functionName,
  message,
  logLevel,
  context,
  errorContext,
  extraContext,
}: BuildMessageInput): string {
  const sharedFields = {
    ...errorContext,
    ...extraContext,
  };

  if (
    config.app.environment === "development" ||
    config.app.environment === "test"
  ) {
    return `[${new Date().toISOString()}] ${logLevel.toUpperCase()} ${functionName} ${context.correlationId} ${context.requestId} ${message}`;
  }

  const logEntry: OpenSearchLog = {
    timestamp: new Date().toISOString(),
    level: logLevel,
    service: config.SERVICE_NAME ?? "laa-inquests-external-ui",
    environment: config.app.environment,
    request_id: context.requestId,
    correlation_id: context.correlationId,
    function_name: functionName,
    message,
    ...sharedFields,
  };

  return JSON.stringify(logEntry);
}

const configuredLogLevel = getConfiguredLogLevel();
const logger = new Logger(configuredLogLevel);

if (!validLogLevel(config.LOG_LEVEL)) {
  logger.logWarn({
    functionName: "logger",
    message: "Invalid or missing LOG_LEVEL. Falling back to info.",
    extraContext: {
      event: "log_level_invalid_fallback",
      configured_log_level: config.LOG_LEVEL ?? "",
      fallback_log_level: "info",
    },
  });
}

export { Logger, logger };
