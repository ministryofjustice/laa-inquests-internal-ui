import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Config } from "#src/infrastructure/config/config.types.js";
import { HTTP_TOO_MANY_REQUESTS } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";

export const setupReportRateLimiter = (
  config: Config,
  reportType: string,
): RateLimitRequestHandler => {
  /**
   * Rate limiter for report downloads.
   * Limits each IP to a configurable number of requests per time window.
   */
  const reportRateLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_PER_REPORT_MS,
    max: 1,
    skip: (req, res) =>
      process.env.NODE_ENV === "test" &&
      req.headers["x-test-enable-report-rate-limit"] !== "true",
    handler: (req, res, next) => {
      logger.logError({
        functionName: "app",
        message: `${reportType} report download rate limit has been exceeded by user`,
      });
      if (reportType === "Payment extract") {
        res.locals.rateLimit = true;
        next();
        return;
      }
      res.status(HTTP_TOO_MANY_REQUESTS).render("reports/index", {
        backUrl: "/",
        shouldShowRateLimitText: true,
        config,
      });
    },
  });
  return reportRateLimiter;
};
