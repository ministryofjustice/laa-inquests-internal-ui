import { expect } from "chai";
import { createConfig } from "#src/infrastructure/config/config.js";

const REQUIRED_ENV = {
  SESSION_SECRET: "secret",
  SESSION_NAME: "sessionId",
  USE_REDIS: "false",
  AUTH_DIRECTORY_URL: "https://login.example.com/tenant",
  AUTH_CLIENT_ID: "client-id",
  AUTH_CLIENT_SECRET: "client-secret",
  AUTH_REDIRECT_URI: "http://localhost/auth/callback",
  AUTH_POST_LOGOUT_URI: "http://localhost",
  SESSION_LOG_SECRET: "log-secret",
};

const importConfig = async (
  env: Record<string, string | undefined>,
): Promise<unknown> => {
  // Merge required env with test-specific env
  const testEnv = { ...REQUIRED_ENV, ...env };

  // Return the config object directly from the factory
  return { default: { ...createConfig(testEnv) } };
};

describe("config SENTRY_DSN", () => {
  it("throws in production when SENTRY_DSN is missing", async () => {
    let error: Error | undefined;
    try {
      await importConfig({ NODE_ENV: "production", SENTRY_DSN: undefined });
    } catch (err) {
      error = err as Error;
    }

    expect(error?.message).to.equal(
      "SENTRY_DSN must be defined in environment variables.",
    );
  });

  it("throws in production when SENTRY_DSN is empty", async () => {
    let error: Error | undefined;
    try {
      await importConfig({ NODE_ENV: "production", SENTRY_DSN: "" });
    } catch (err) {
      error = err as Error;
    }

    expect(error?.message).to.equal(
      "SENTRY_DSN must be defined in environment variables.",
    );
  });

  it("loads in production when SENTRY_DSN is set", async () => {
    const module = (await importConfig({
      NODE_ENV: "production",
      SENTRY_DSN: "https://key@o0.ingest.sentry.io/1",
    })) as { default: { SENTRY_DSN: string } };

    expect(module.default.SENTRY_DSN).to.equal(
      "https://key@o0.ingest.sentry.io/1",
    );
  });

  it("does not require SENTRY_DSN in development", async () => {
    const module = (await importConfig({
      NODE_ENV: "development",
      SENTRY_DSN: undefined,
    })) as { default: { SENTRY_DSN: string } };

    expect(module.default.SENTRY_DSN).to.equal("");
  });

  it("does not require SENTRY_DSN in test", async () => {
    const module = (await importConfig({
      NODE_ENV: "test",
      SENTRY_DSN: undefined,
    })) as { default: { SENTRY_DSN: string } };

    expect(module.default.SENTRY_DSN).to.equal("");
  });
});

describe("config SESSION_LOG_SECRET", () => {
  it("throws outside test when SESSION_LOG_SECRET is missing", async () => {
    let error: Error | undefined;
    try {
      await importConfig({
        NODE_ENV: "development",
        SESSION_LOG_SECRET: undefined,
      });
    } catch (err) {
      error = err as Error;
    }

    expect(error?.message).to.equal(
      "The following environment variables must be defined: SESSION_LOG_SECRET",
    );
  });

  it("does not require SESSION_LOG_SECRET in test", async () => {
    const module = (await importConfig({
      NODE_ENV: "test",
      SESSION_LOG_SECRET: undefined,
    })) as { default: { SESSION_LOG_SECRET: string } };

    expect(module.default.SESSION_LOG_SECRET).to.equal("");
  });
});
