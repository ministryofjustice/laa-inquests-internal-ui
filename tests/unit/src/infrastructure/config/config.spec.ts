import { expect } from "chai";

const REQUIRED_ENV = {
  SESSION_SECRET: "secret",
  SESSION_NAME: "sessionId",
  USE_REDIS: "false",
  AUTH_DIRECTORY_URL: "https://login.example.com/tenant",
  AUTH_CLIENT_ID: "client-id",
  AUTH_CLIENT_SECRET: "client-secret",
  AUTH_REDIRECT_URI: "http://localhost/auth/callback",
  AUTH_POST_LOGOUT_URI: "http://localhost",
};

let importCounter = 0;

const importConfig = async (
  env: Record<string, string | undefined>,
): Promise<unknown> => {
  const originalEnv = { ...process.env };
  Object.assign(process.env, REQUIRED_ENV);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    // The query string forces a fresh evaluation of the module on every call.
    importCounter += 1;
    return await import(
      `../../../../../src/infrastructure/config/config.ts?case=${importCounter}`
    );
  } finally {
    process.env = originalEnv;
  }
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
