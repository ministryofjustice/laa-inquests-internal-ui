import express from 'express';
import session from 'express-session';
import type { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import compression from 'compression';
import config from '#src/infrastructure/config/config.js';
import helmet from 'helmet';
import { initializeI18nextSync } from '#src/infrastructure/express/middleware/nunjucks/i18nLoader.js';
import { setupAxiosMiddleware } from "./axios/index.js";
import { setupRateLimiter } from "./security/setupRateLimiter.js";
import { setupNunjucks } from "./nunjucks/setupNunjucks.js";
import { setupLocaleData } from "./nunjucks/setupLocaleData.js";
import { setupCsrf } from "./security/setupCsrf.js";
import crypto from 'node:crypto';
import { helmetConfig } from "#src/infrastructure/config/helmet.js";

const RANDOMBYTES = 16;

// Middleware to generate a unique CSP nonce for each request.
const nonceMiddleware = (_: Request, res: Response, next: NextFunction): void => {
  res.locals.cspNonce = crypto.randomBytes(RANDOMBYTES).toString('base64'); // Generate a secure random nonce
  next();
};

export function setupMiddleware(app: Application): void {
  const TRUST_FIRST_PROXY = 1;
  app.set('trust proxy', TRUST_FIRST_PROXY);
  app.set('view engine', 'njk');

  initializeI18nextSync()

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(config.paths.static));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(compression({
    filter: (req: Request, res: Response): boolean => {
      if ('x-no-compression' in req.headers) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  app.disable('x-powered-by');
  app.use(session(config.session));

  app.use(setupRateLimiter(config))
  app.use((_: Request, res: Response, next: NextFunction): void => {
    res.locals.config = config;
    next();
  });
  app.use(setupLocaleData)
  app.use(setupAxiosMiddleware())
  app.use(nonceMiddleware)
  app.use(helmet(helmetConfig))
  setupNunjucks(app)
  setupCsrf(app)

}