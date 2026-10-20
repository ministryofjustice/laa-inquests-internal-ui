import type { NextFunction, Request, Response } from "express";

export function setupNavigationData(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.locals.cookiesHref = `/cookies?returnTo=${encodeURIComponent(req.originalUrl)}`;

  next();
}
