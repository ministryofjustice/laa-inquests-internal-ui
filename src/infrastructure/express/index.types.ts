import type { AxiosInstanceWrapper } from "#src/infrastructure/express/middleware/axios/index.types.js";
import type { ExpressLocaleLoader } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";

declare global {
  namespace Express {
    interface Request {
      axiosMiddleware: AxiosInstanceWrapper;
      locale: ExpressLocaleLoader;
    }
  }
}