import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Config } from "#src/infrastructure/config/config.types.js";

export const setupRateLimiter = (config: Config): RateLimitRequestHandler[] => {
  /**
   * Rate limiter for general routes.
   * Limits globally to configurable number of requests per time window.
   */
  const globalLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_MS,
    max: config.RATE_LIMIT_GLOBAL_MAX,
    keyGenerator: () => "service",
    skip: () => process.env.NODE_ENV === "test",
    message: "Service request limit reached, please try again later.",
  });
  /**
   * Rate limiter for general routes.
   * Limits each IP to a configurable number of requests per time window.
   */
  const perIpLimiter = rateLimit({
    windowMs: config.RATE_WINDOW_MS,
    max: config.RATE_LIMIT_IP_MAX,
    skip: () => process.env.NODE_ENV === "test",
    message: "Too many requests, please try again later.",
  });

  // Apply the global and per Ip limiter to service requests
  return [perIpLimiter, globalLimiter];
};
