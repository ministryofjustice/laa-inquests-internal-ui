import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import type { Request, Response, NextFunction } from "express";

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 360;

export function setCookies(res: Response, acceptCookies: boolean): void {
  try {
    res.cookie(
      "cookies_policy",
      { has_tracking_consent: acceptCookies },
      { maxAge: ONE_YEAR_MS, httpOnly: true, sameSite: "strict" },
    );
  } catch (err) {}
}

export default function processCookies(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    let hasTrackingConsent = false;
    const cookiePolicy: string | undefined = req.cookies.cookies_policy as
      string | undefined;

    if (cookiePolicy !== undefined) {
      const parsedPolicy: unknown = JSON.parse(
        decodeURIComponent(cookiePolicy),
      );
      if (
        typeof parsedPolicy === "object" &&
        parsedPolicy !== null &&
        "has_tracking_consent" in parsedPolicy &&
        typeof parsedPolicy.has_tracking_consent === "boolean"
      ) {
        ({ has_tracking_consent: hasTrackingConsent } = parsedPolicy);
      }
    }

    res.locals.hasTrackingConsent = hasTrackingConsent;
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
