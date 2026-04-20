import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Config } from "#src/infrastructure/config/config.types.js";

export const setupRateLimiter = (config: Config): RateLimitRequestHandler => {
  /**
   * Rate limiter for general routes.
   * Limits each IP to a configurable number of requests per time window.
   */
  const generalLimiter = rateLimit({
    windowMs:
      typeof config.RATE_WINDOW_MS === "string"
        ? parseInt(config.RATE_WINDOW_MS, 10)
        : config.RATE_WINDOW_MS,
    max:
      typeof config.RATE_LIMIT_MAX === "string"
        ? parseInt(config.RATE_LIMIT_MAX, 10)
        : config.RATE_LIMIT_MAX,
    message: "Too many requests, please try again later.",
  });

  // Apply the general rate limiter to all requests
  return generalLimiter;
};
