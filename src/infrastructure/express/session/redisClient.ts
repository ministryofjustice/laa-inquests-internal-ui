import { createClient, type RedisClientType } from "@redis/client";
import config from "#src/infrastructure/config/config.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export const createRedisClient = (): RedisClientType => {
  const encodedRedisAuthToken = encodeURIComponent(config.REDIS_AUTH_TOKEN);

  const client: RedisClientType = createClient({
    url: `rediss://:${encodedRedisAuthToken}@${config.REDIS_HOST_NAME}:6379`,
  });
  //
  client.on("error", (err: unknown) => {
    logger.logError("createRedisClient", "Redis client error", err);
  });

  return client;
};
