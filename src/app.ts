import type { Request, Response } from "express";
import express from "express";
import chalk from "chalk";
import morgan from "morgan";
import compression from "compression";
import {
  setupCsrf,
  setupMiddlewares,
  setupConfig,
  setupLocaleMiddleware,
} from "#middleware/index.js";
import session from "express-session";
import {
  nunjucksSetup,
  rateLimitSetUp,
  helmetSetup,
  axiosMiddleware,
  displayAsciiBanner,
} from "#utils/index.js";
import { initializeI18nextSync } from "#src/scripts/helpers/index.js";
import config from "#config.js";
import indexRouter from "#routes/index.js";
import livereload from "connect-livereload";

const TRUST_FIRST_PROXY = 1;

initializeI18nextSync();

const app = express();

setupMiddlewares(app);

app.use(axiosMiddleware);

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

helmetSetup(app);

app.disable("x-powered-by");

app.set("trust proxy", TRUST_FIRST_PROXY);
app.use(session(config.session));

setupCsrf(app);

app.use(setupLocaleMiddleware);

nunjucksSetup(app);

rateLimitSetUp(app, config);

setupConfig(app);

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

app.use("/", indexRouter);

if (process.env.NODE_ENV === "development") {
  app.use(livereload());
}

displayAsciiBanner(config);

app.listen(config.app.port, () => {
  console.log(chalk.yellow(`Listening on port ${config.app.port}...`));
});

export default app;
