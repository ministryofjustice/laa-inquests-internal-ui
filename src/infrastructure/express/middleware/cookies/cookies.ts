import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { cookiePolicySchema } from "#src/adaptors/models/cookies.schema.js";
import type { Request, Response, NextFunction } from "express";

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export function setCookies(res: Response, acceptCookies: boolean): void {
  res.cookie(
    "cookies_policy",
    { has_tracking_consent: acceptCookies },
    { maxAge: ONE_YEAR_MS, httpOnly: true, sameSite: "strict" },
  );

  res.locals.hasTrackingConsent = acceptCookies;
}

export function parseTrackingConsent(raw: unknown): boolean | undefined {
  const value: unknown =
    typeof raw === "string" ? JSON.parse(decodeURIComponent(raw)) : raw;
  const result = cookiePolicySchema.safeParse(value);
  if (result.success) {
    return result.data.has_tracking_consent;
  }
  return undefined;
}

export default function processCookies(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.locals.showCookieBanner = true;

  try {
    const consent = parseTrackingConsent(req.cookies.cookies_policy);
    res.locals.hasTrackingConsent = consent === true;
    if (consent === undefined) {
      req.session.cookieBannerState = "initial";
    }
  } catch (err) {
    console.log("Error occurred while processing cookies:", err);
    res.locals.hasTrackingConsent = false;
    logger.logError({
      functionName: "process_cookies_middleware",
      message: "Processing cookies failed",
      request: req,
      extraContext: {
        event: "processing_cookies_failed",
        method: req.method,
        status_code: HTTP_INTERNAL_SERVER_ERROR,
      },
    });
  }

  next();
}
