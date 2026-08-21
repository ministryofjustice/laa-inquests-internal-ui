import { createClient, type RedisClientType } from "@redis/client";
import config from "#src/infrastructure/config/config.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

export const createRedisClient = (): RedisClientType => {
  const url =
    config.REDIS_AUTH_TOKEN === ""
      ? `redis://${config.REDIS_HOST_NAME}:6379`
      : `rediss://:${encodeURIComponent(config.REDIS_AUTH_TOKEN)}@${config.REDIS_HOST_NAME}:6379`;

  const client: RedisClientType = createClient({
    url,
  });
  //
  client.on("error", (err: unknown) => {
    logger.logError({
      functionName: "create_redis_client",
      message: "Redis client error",
      err,
      extraContext: {
        event: "redis_client_error",
      },
    });
  });

  return client;
};
