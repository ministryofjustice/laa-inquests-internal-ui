import { csrfSync } from "csrf-sync";
import type { Application, Request, Response, NextFunction } from 'express';
import '#src/infrastructure/express/middleware/security/csrf.types.js';

const hasCSRFToken = (body: unknown): body is { _csrf: unknown } =>
  body !== null &&
  body !== undefined &&
  typeof body === "object" &&
  "_csrf" in body;

/*
 - Protects against CSRF attacks using `csrfSync`.
 - Ensures CSRF tokens are available in views for forms.
*/
export const setupCsrf = (app: Application): void => {
  const { csrfSynchronisedProtection } = csrfSync({
    // Extracts the CSRF token from the request body.
    getTokenFromRequest: (req: Request): string | undefined => {
      // Type guard to ensure req.body exists and has _csrf property
      if (hasCSRFToken(req.body)) {
        return typeof req.body._csrf === "string" ? req.body._csrf : undefined;
      }
      return undefined;
    },
  });

  app.use(csrfSynchronisedProtection);

  // Middleware to make CSRF token available in views
  app.use((req: Request, res: Response, next: NextFunction): void => {
    if (typeof req.csrfToken === "function") {
      res.locals.csrfToken = req.csrfToken();
    }
    next();
  });
};
