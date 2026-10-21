import type { NextFunction, Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";

export function setupNavigationData(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { originalUrl, method } = req;
  if (method === "GET" && !originalUrl.startsWith("/cookies")) {
    req.session.returnTo = originalUrl;
  }

  const { cookieBannerState } = session;
  if (
    method === "GET" &&
    (cookieBannerState === "accepted" || cookieBannerState === "rejected")
  ) {
    const expectedConsent = cookieBannerState === "accepted";
    if (
      res.locals.showCookieBanner === false &&
      res.locals.hasTrackingConsent === expectedConsent
    ) {
      res.locals.cookieBannerConfirmation = cookieBannerState;
      session.cookieBannerState = undefined;
      logger.logInfo({
        functionName: "verify_cookie_preferences",
        message: "Cookie preference storage confirmed",
        request: req,
        extraContext: {
          event: "cookies_preferences_saved",
        },
      });
    } else {
      session.cookieBannerState = "failed";
      logger.logError({
        functionName: "verify_cookie_preferences",
        message: "Cookie preference was not returned with the saved choice",
        request: req,
        extraContext: {
          event: "cookies_preferences_save_failed",
        },
      });
    }
  }

  if (session.cookieBannerState === "failed") {
    res.locals.hasTrackingConsent = false;
    res.locals.showCookieBanner = true;
  }

  next();
}
