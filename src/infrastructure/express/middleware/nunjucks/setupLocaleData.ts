import { t, type ExpressLocaleLoader } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";
import type { Request, Response, NextFunction } from 'express';


// Middleware to inject locale data into template locals
export function setupLocaleData(req: Request, res: Response, next: NextFunction): void {

  const localeData: ExpressLocaleLoader = {
    t
  };

  const { t: localeT } = localeData;

  // Make locale data available in all templates
  res.locals.t = localeT;

  // Also make it available on the request object for controllers
  req.locale = localeData;

  next();
}