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

  next();
}
