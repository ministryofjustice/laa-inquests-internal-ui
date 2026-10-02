import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Config } from "#src/infrastructure/config/config.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { HTTP_TOO_MANY_REQUESTS } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";

export const setupReportRateLimiter = (
  config: Config,
  reportType: string,
): RateLimitRequestHandler[] => {
  /**
   * Rate limiter for report downloads.
   * Limits each IP to a configurable number of requests per time window.
   */
  const reportRateLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_PER_REPORT_MS,
    max: 1,
    skip: () => process.env.NODE_ENV === "test",
    handler: (req, res, next) => {
      logger.logError({
        functionName: "app",
        message: `${reportType} report download rate limit has been exceeded by user`,
      });
      if (reportType === "Payment extract") {
        // Additional handling for Payment extract report rate limit exceeded
        req.query.rateLimitExceeded = "yes";
        next(req);
        return;
      }
      res.status(HTTP_TOO_MANY_REQUESTS).render("reports/index", {
        backUrl: "/",
        errorSummaries: true,
        errorList: [{ text: en.pages.error.rateLimitError.reportLimitMessage }],
        config,
      });
    },
  });
  const debouncer = rateLimit({
    windowMs: 1000,
    max: 1,
    skip: () => process.env.NODE_ENV === "test",
    handler: (req, res) => {
      // To do: Can we avoid returning user to the top of the page?
      res.render("reports/index", {
        backUrl: "/",
        config,
      });
    },
  });

  return [debouncer, reportRateLimiter];
};
