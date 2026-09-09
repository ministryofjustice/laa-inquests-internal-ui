import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { runWithLoggingContext } from "#src/infrastructure/logging/logger.js";

function headerValueToString(
  headerValue: string | string[] | undefined,
): string | undefined {
  if (typeof headerValue === "string") {
    return headerValue.trim() === "" ? undefined : headerValue;
  } else if (Array.isArray(headerValue)) {
    const [firstHeaderValue] = headerValue;
    return typeof firstHeaderValue === "string" &&
      firstHeaderValue.trim() !== ""
      ? firstHeaderValue
      : undefined;
  } else {
    return undefined;
  }
}

export function requestLoggingContext(
  req: Request,
  _: Response,
  next: NextFunction,
): void {
  const requestId =
    headerValueToString(req.headers["x-request-id"]) ?? randomUUID();
  const correlationId =
    headerValueToString(req.headers["x-correlation-id"]) ?? requestId;

  runWithLoggingContext({ requestId, correlationId }, next);
}
