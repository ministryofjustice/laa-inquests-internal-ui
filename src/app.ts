import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import morgan from "morgan";
import indexRouter from "#src/infrastructure/express/routes/index.js";
import livereload from "connect-livereload";
import config from "#src/infrastructure/config/config.js";
import {
  handleAxiosErrors,
  handleCustomErrors,
  handleRouteNotFound,
  handleServerErrors,
  handleZodErrors,
} from "#src/infrastructure/express/middleware/errors/errors.js";
import { initializeI18nextSync } from "./infrastructure/express/middleware/nunjucks/i18nLoader.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import compression from "compression";
import session from "express-session";
import helmet from "helmet";
import { helmetConfig } from "./infrastructure/config/helmet.js";
import { setupLocaleData } from "./infrastructure/express/middleware/nunjucks/setupLocaleData.js";
import { setupNunjucks } from "./infrastructure/express/middleware/nunjucks/setupNunjucks.js";
import { setupCsrf } from "./infrastructure/express/middleware/security/setupCsrf.js";
import { setupRateLimiter } from "./infrastructure/express/middleware/security/setupRateLimiter.js";
import crypto from "node:crypto";

const RANDOMBYTES = 16;
const TRUST_FIRST_PROXY = 1;

const nonceMiddleware = (
  _: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.locals.cspNonce = crypto.randomBytes(RANDOMBYTES).toString("base64"); // Generate a secure random nonce
  next();
};

const app = express();

app.set("trust proxy", TRUST_FIRST_PROXY);
app.set("view engine", "njk");

initializeI18nextSync();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(config.paths.static));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  compression({
    filter: (req: Request, res: Response): boolean => {
      if ("x-no-compression" in req.headers) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

app.disable("x-powered-by");
app.use(session(config.session));

app.use(setupRateLimiter(config));
app.use((_: Request, res: Response, next: NextFunction): void => {
  res.locals.config = config;
  next();
});
app.use(setupLocaleData);
app.use(nonceMiddleware);
app.use(helmet(helmetConfig));
setupNunjucks(app);
setupCsrf(app);

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

app.use("/", indexRouter);

app.all("{*splat}", handleRouteNotFound);
app.use(handleCustomErrors);
app.use(handleAxiosErrors);
app.use(handleZodErrors);
app.use(handleServerErrors);

if (process.env.NODE_ENV === "development") {
  app.use(livereload());
}

app.listen(config.app.port, () => {
  console.log(`Listening on http://localhost:${config.app.port}/...`);
});

export default app;
