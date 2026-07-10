import type { NextFunction, Request, Response } from "express";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

const handleRouteNotFound = (_: Request, res: Response): void => {
  res.status(404).render("main/error", {
    status: 404,
    message: "Page not found",
  });
};

const handleServerErrors = (
  err: unknown,
  req: Request,
  res: Response,
  _: NextFunction,
): void => {
  logger.logError("Server Error Middleware", "Internal Server Error", err, req);
  res.render("main/error", { status: 500, message: "Internal Server Error" });
};

export { handleRouteNotFound, handleServerErrors };
