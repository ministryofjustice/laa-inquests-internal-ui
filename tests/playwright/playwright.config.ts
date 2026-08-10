import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { AUTH_FILE } from "./constants/AuthFile.js";

dotenv.config({ path: "../.env.internal" });
/**
 * Configuration values for MSW handlers
 */
export const MSW_CONFIG = {
  API_BASE_URL: "https://test.cloud-platform.service.justice.gov.uk",
  API_PREFIX: "/latest/mock",
};

/**
 * Test configuration values
 */
export const TEST_CONFIG = {
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  INQUESTS_API_URL:
    process.env.INQUESTS_API_URL ??
    "https://laa-inquests-api-test.apps.live.cloud-platform.service.justice.gov.uk",
};

/**
 * Playwright configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI ?? false),
  retries: process.env.CI === "true" ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: TEST_CONFIG.BASE_URL,
    trace: process.env.CI === "true" ? "on" : "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testDir: "./setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "seed application",
      testDir: "./setup",
      testMatch: /seedApplication\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      dependencies: ["setup"],
    },
    {
      name: "e2e - no auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "yarn tsx tests/playwright/factories/handlers/testMsw.js",
    url: "http://localhost:3000/status",
    reuseExistingServer: process.env.CI !== "true",
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60000,
    cwd: "../..", // Run from project root since config is now in tests/playwright/ subdirectory
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      SESSION_SECRET: "test-secret-key-for-playwright-tests",
      SESSION_NAME: "test-session",
      SERVICE_NAME: "Inquests",
      // Auth is faked via the /auth/test-login route, so real Entra credentials
      // are never used in test env. MSAL still requires a non-empty client credential to
      // construct, so fall back to dummy values when none are provided (e.g. CI).
      AUTH_DIRECTORY_URL:
        process.env.AUTH_DIRECTORY_URL ??
        "https://login.microsoftonline.com/test-tenant-id",
      AUTH_CLIENT_ID: process.env.AUTH_CLIENT_ID ?? "test-client-id",
      AUTH_CLIENT_SECRET:
        process.env.AUTH_CLIENT_SECRET ?? "test-client-secret",
      AUTH_REDIRECT_URI: "http://localhost:3000/auth/callback",
      AUTH_POST_LOGOUT_URI: "http://localhost:3000",
      INQUESTS_API_CLIENT_ID: process.env.INQUESTS_API_CLIENT_ID ?? "",
      INQUESTS_API_URL: TEST_CONFIG.INQUESTS_API_URL,
    },
  },
});
