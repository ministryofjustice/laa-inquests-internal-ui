import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Config } from "#src/infrastructure/config/config.types.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { HTTP_TOO_MANY_REQUESTS } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";

export const setupGeneralRateLimiter = (
  config: Config,
): RateLimitRequestHandler[] => {
  /**
   * Rate limiter for general routes.
   * Limits globally to configurable number of requests per time window.
   */
  const globalLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_MS,
    max: config.RATE_LIMIT_GLOBAL_MAX,
    keyGenerator: () => "service",
    skip: () => process.env.NODE_ENV === "test",
    handler: (req, res) => {
      logger.logError({
        functionName: "app",
        message: "Rate limit has been exceeded for global use",
      });
      res.status(HTTP_TOO_MANY_REQUESTS).render("main/error-rate-limit.njk", {
        tryAgainMessage: en.pages.error.rateLimitError.tryAgainMessageGlobal,
        rateLimitMessage: en.pages.error.rateLimitError.globalLimitMessage,
        config,
      });
    },
  });
  /**
   * Rate limiter for general routes.
   * Limits each IP to a configurable number of requests per time window.
   */
  const perIpLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_MS,
    max: config.RATE_LIMIT_IP_MAX,
    skip: () => process.env.NODE_ENV === "test",
    handler: (req, res) => {
      logger.logError({
        functionName: "app",
        message: "Rate limit has been exceeded per Ip by user",
      });
      res.status(HTTP_TOO_MANY_REQUESTS).render("main/error-rate-limit.njk", {
        tryAgainMessage: en.pages.error.rateLimitError.tryAgainMessageIp,
        rateLimitMessage: en.pages.error.rateLimitError.IpLimitMessage,
        config,
      });
    },
  });

  // Apply the global and per Ip limiter to service requests
  return [perIpLimiter, globalLimiter];
};
