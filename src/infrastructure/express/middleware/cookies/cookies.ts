import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { cookiePolicySchema } from "#src/adaptors/models/cookies.schema.js";
import type { Request, Response, NextFunction } from "express";
import { ONE_YEAR_MS } from "#src/infrastructure/locales/constants.js";

export function setCookies(res: Response, acceptCookies: boolean): void {
  try {
    res.cookie(
      "cookies_policy",
      { has_tracking_consent: acceptCookies },
      { maxAge: ONE_YEAR_MS, httpOnly: true, sameSite: "strict" },
    );

    res.locals.hasTrackingConsent = acceptCookies;
  } catch (err) {}
}

export function parseTrackingConsent(raw: unknown): boolean {
  const value: unknown =
    typeof raw === "string" ? JSON.parse(decodeURIComponent(raw)) : raw;
  const result = cookiePolicySchema.safeParse(value);
  if (result.success) {
    return result.data.has_tracking_consent;
  }
  return false;
}

export default function processCookies(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    res.locals.hasTrackingConsent = parseTrackingConsent(
      req.cookies.cookies_policy,
    );
  } catch (err) {
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

  // TODO: Also check if the user made a choice (to conditionally show/hide the banner)
  // res.locals.showCookieBanner = !req.cookies.cookies_preferences_set;

  next();
}
