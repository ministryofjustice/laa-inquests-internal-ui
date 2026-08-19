import { RedisStore } from "connect-redis";
import type { Store } from "express-session";
import config from "#src/infrastructure/config/config.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { createRedisClient } from "#src/infrastructure/express/session/redisClient.js";

// Returns undefined in test so express-session falls back to its in-memory store.
export const createSessionStore = (): Store | undefined => {
  if (config.app.environment === "test" || !config.USE_REDIS) {
    return undefined;
  }

  const client = createRedisClient();
  client.connect().catch((err: unknown) => {
    logger.logError("createSessionStore", "Failed to connect to Redis", err);
  });

  return new RedisStore({ client, prefix: "inquests:sess:" });
};
