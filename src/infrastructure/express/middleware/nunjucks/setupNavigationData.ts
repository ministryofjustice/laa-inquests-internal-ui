import type { NextFunction, Request, Response } from "express";

export function setupNavigationData(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { originalUrl, method } = req;
  if (method === "GET") {
    if (!originalUrl.startsWith("/cookies")) {
      req.session.returnTo = originalUrl;
    }
    const { cookieBannerState } = req.session;
    res.locals.cookieBannerState = cookieBannerState;
    if (["accepted", "rejected"].includes(cookieBannerState as string)) {
      req.session.cookieBannerState = "closed";
    }
  
    if (req.session.cookieBannerState === "failed") {
      res.locals.hasTrackingConsent = false;
      res.locals.showCookieBanner = true;
    }
  }

  next();
}
