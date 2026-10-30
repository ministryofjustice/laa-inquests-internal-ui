import dotenv from "dotenv";
import { z } from "zod";
import type { Config } from "#src/infrastructure/config/config.types.js";

const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_WINDOW_PER_REPORT_MS = 5000;
const DEFAULT_RATE_WINDOW_MS_MINUTE = 15;
const MILLISECONDS_IN_A_MINUTE = 60000;
const DEFAULT_PORT = 3000;
const DEFAULT_SERVICE_NAME = "Manage inquest legal aid";

const configSchema = z
  .object({
    SESSION_SECRET: z.string().min(1),
    SESSION_NAME: z.string().min(1),
    AUTH_DIRECTORY_URL: z.string().optional(),
    AUTH_CLIENT_ID: z.string().optional(),
    AUTH_CLIENT_SECRET: z.string().optional(),
    AUTH_REDIRECT_URI: z.string().optional(),
    AUTH_POST_LOGOUT_URI: z.string().optional(),
    SESSION_LOG_SECRET: z.string().optional(),
    INQUESTS_API_CLIENT_ID: z.string().optional(),
    NODE_ENV: z.string().optional(),
    USE_REDIS: z.string().optional().default("true"),
    REDIS_HOST_NAME: z.string().optional(),
    REDIS_AUTH_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    SERVICE_NAME: z.string().optional(),
    CONTACT_EMAIL: z.string().optional(),
    CONTACT_PHONE: z.string().optional(),
    DEPARTMENT_NAME: z.string().optional(),
    DEPARTMENT_URL: z.string().optional(),
    ENVIRONMENT: z.string().optional(),
    INQUESTS_API_URL: z.string().optional(),
    RATE_LIMIT_GLOBAL_MAX: z.string().optional(),
    RATE_LIMIT_IP_MAX: z.string().optional(),
    RATE_WINDOW_PER_REPORT_MS: z.string().optional(),
    RATE_WINDOW_MS: z.string().optional(),
    LOG_LEVEL: z.string().optional(),
    SERVICE_PHASE: z.string().optional(),
    SERVICE_URL: z.string().optional(),
    PORT: z.string().optional(),
    GA_MEASUREMENT_ID: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const nodeEnv = env.NODE_ENV ?? "development";

    // Check AUTH vars requirement (only required outside test)
    if (nodeEnv !== "test") {
      const missingAuthVars = [
        "AUTH_DIRECTORY_URL",
        "AUTH_CLIENT_ID",
        "AUTH_CLIENT_SECRET",
        "AUTH_REDIRECT_URI",
        "AUTH_POST_LOGOUT_URI",
        "SESSION_LOG_SECRET",
      ].filter(
        (key) =>
          !env[key as keyof typeof env] || env[key as keyof typeof env] === "",
      );

      if (missingAuthVars.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: missingAuthVars,
          message: `The following environment variables must be defined: ${missingAuthVars.join(", ")}`,
        });
      }
    }

    validateRedisConfig(env, ctx);
    validateSentryConfig(env, ctx);
  });

/**
 * Validate Redis configuration requirements.
 */
function validateRedisConfig(
  env: z.infer<typeof configSchema>,
  ctx: z.RefinementCtx,
): void {
  const nodeEnv = env.NODE_ENV ?? "development";
  const useRedis = env.USE_REDIS !== "false";

  if (
    useRedis &&
    nodeEnv !== "test" &&
    (!env.REDIS_HOST_NAME || env.REDIS_HOST_NAME === "")
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_HOST_NAME"],
      message: "REDIS_HOST_NAME must be defined in environment variables.",
    });
  }

  if (
    useRedis &&
    nodeEnv === "production" &&
    (!env.REDIS_AUTH_TOKEN || env.REDIS_AUTH_TOKEN === "")
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["REDIS_AUTH_TOKEN"],
      message: "REDIS_AUTH_TOKEN must be defined in environment variables.",
    });
  }
}

/**
 * Validate Sentry configuration requirements.
 */
function validateSentryConfig(
  env: z.infer<typeof configSchema>,
  ctx: z.RefinementCtx,
): void {
  const nodeEnv = env.NODE_ENV ?? "development";

  if (nodeEnv === "production" && (!env.SENTRY_DSN || env.SENTRY_DSN === "")) {
    ctx.addIssue({
      code: "custom",
      path: ["SENTRY_DSN"],
      message: "SENTRY_DSN must be defined in environment variables.",
    });
  }
}

/**
 * Convert Zod errors to a simple Error with the first custom message.
 */
function handleZodError(err: unknown): never {
  if (err instanceof z.ZodError) {
    const customError = err.issues.find((e) => e.code === "custom");
    const errorToThrow = customError ?? err.issues[0];
    throw new Error(errorToThrow.message);
  }
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Catch-all for unexpected error types
  throw err;
}

/**
 * Create a config object from environment variables.
 * This function is pure and testable - no side effects like loading dotenv.
 */
// eslint-disable-next-line complexity -- Config object has many properties, complexity is unavoidable
export function createConfig(env: Record<string, string | undefined>): Config {
  const validated: z.infer<typeof configSchema> = (() => {
    try {
      return configSchema.parse(env);
    } catch (err) {
      handleZodError(err);
    }
  })();

  const useRedis = validated.USE_REDIS !== "false";
  const nodeEnv = validated.NODE_ENV ?? "development";
  const serviceName = validated.SERVICE_NAME ?? DEFAULT_SERVICE_NAME;

  // Get environment variables
  const config: Config = {
    AUTH_DIRECTORY_URL: validated.AUTH_DIRECTORY_URL ?? "",
    AUTH_CLIENT_ID: validated.AUTH_CLIENT_ID ?? "",
    AUTH_CLIENT_SECRET: validated.AUTH_CLIENT_SECRET ?? "",
    AUTH_REDIRECT_URI: validated.AUTH_REDIRECT_URI ?? "",
    AUTH_POST_LOGOUT_URI: validated.AUTH_POST_LOGOUT_URI ?? "",
    AUTH_SCOPES: [
      "openid",
      "profile",
      "offline_access",
      `api://${validated.INQUESTS_API_CLIENT_ID ?? ""}/User.Caseworker`,
    ],
    CONTACT_EMAIL: validated.CONTACT_EMAIL,
    CONTACT_PHONE: validated.CONTACT_PHONE,
    DEPARTMENT_NAME: validated.DEPARTMENT_NAME,
    DEPARTMENT_URL: validated.DEPARTMENT_URL,
    ENVIRONMENT: validated.ENVIRONMENT ?? "unknown",
    INQUESTS_API_URL: validated.INQUESTS_API_URL ?? "",
    RATE_LIMIT_GLOBAL_MAX: Number(
      validated.RATE_LIMIT_GLOBAL_MAX ?? DEFAULT_RATE_LIMIT_MAX,
    ),
    RATE_LIMIT_IP_MAX: Number(
      validated.RATE_LIMIT_IP_MAX ?? DEFAULT_RATE_LIMIT_MAX,
    ),
    RATE_WINDOW_PER_REPORT_MS: Number(
      validated.RATE_WINDOW_PER_REPORT_MS ?? DEFAULT_RATE_WINDOW_PER_REPORT_MS,
    ),
    RATE_WINDOW_MS: Number(
      validated.RATE_WINDOW_MS ??
        DEFAULT_RATE_WINDOW_MS_MINUTE * MILLISECONDS_IN_A_MINUTE,
    ),
    SERVICE_NAME: serviceName,
    LOG_LEVEL: validated.LOG_LEVEL,
    SERVICE_PHASE: validated.SERVICE_PHASE,
    SERVICE_URL: validated.SERVICE_URL,
    SENTRY_DSN: validated.SENTRY_DSN ?? "",
    USE_REDIS: useRedis,
    REDIS_HOST_NAME: validated.REDIS_HOST_NAME ?? "",
    REDIS_AUTH_TOKEN: validated.REDIS_AUTH_TOKEN ?? "",
    SESSION_LOG_SECRET:
      validated.SESSION_LOG_SECRET ?? (nodeEnv === "test" ? "" : ""),
    session: {
      secret: validated.SESSION_SECRET,
      name: validated.SESSION_NAME,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: nodeEnv === "production",
        httpOnly: true,
        sameSite: "lax",
      },
    },
    app: {
      port: Number(validated.PORT ?? DEFAULT_PORT),
      environment: nodeEnv,
      appName: serviceName,
      useHttps: nodeEnv === "production",
    },
    csrf: {
      cookieName: "_csrf",
      secure: nodeEnv === "production",
      httpOnly: true,
    },
    paths: {
      static: "public",
      views: "src/views",
    },
    GA_MEASUREMENT_ID: validated.GA_MEASUREMENT_ID ?? "",
  };

  return config;
}

// Load .env.internal and create default config for application startup
dotenv.config({ path: "../.env.internal" });


const config = createConfig(process.env);

export default config;
