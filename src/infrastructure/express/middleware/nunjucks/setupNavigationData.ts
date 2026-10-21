import type { NextFunction, Request, Response } from "express";

export function setupNavigationData(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { originalUrl, method } = req;
  if (method === "GET" && !originalUrl.startsWith("/cookies")) {
    req.session.returnTo = originalUrl;
  }

  // If loading a page and on previuos page got the cookie banner confirmation, remove it
  if (method === "GET" && session.cookieBannerConfirmation) {
    ({ cookieBannerConfirmation: res.locals.cookieBannerConfirmation } =
      session);
    session.cookieBannerConfirmation = undefined;
  }

  next();
}
