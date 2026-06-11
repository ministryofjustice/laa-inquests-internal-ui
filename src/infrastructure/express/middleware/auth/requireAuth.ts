import type { Request, Response, NextFunction } from "express";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const userId = req.session.user?.userId;
  if (userId !== undefined && userId !== "") {
    next();
    return;
  }
  res.redirect("/auth/login");
};
