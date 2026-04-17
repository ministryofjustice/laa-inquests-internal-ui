import type { Application, Request, Response, NextFunction } from "express";
import config from "#config.js";

// Middleware setup function
export const setupConfig = (app: Application): void => {
  const configMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    res.locals.config = config;
    next();
  };
  app.use(configMiddleware);
};
