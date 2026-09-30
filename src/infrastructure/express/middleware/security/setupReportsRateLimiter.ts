import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Config } from "#src/infrastructure/config/config.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { HTTP_TOO_MANY_REQUESTS } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";

export const setupRateLimiter = (config: Config): RateLimitRequestHandler => {
  /**
   * Rate limiter for report downloads.
   * Limits each IP to a configurable number of requests per time window.
   */
  const reportLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_PER_REPORT_MS,
    max: 1,
    skip: () => process.env.NODE_ENV === "test",
    handler: (req, res) => {
      logger.logError({
        functionName: "app",
        message: "Report rate limit has been exceeded by user",
      });
      res.status(HTTP_TOO_MANY_REQUESTS).render("main/error.njk", {
        status: HTTP_TOO_MANY_REQUESTS,
        error: en.pages.error.rateLimitError.reportLimitMessage,
        config: { SERVICE_NAME: process.env.SERVICE_NAME },
      });
    },
  });

  return reportLimiter;
};
