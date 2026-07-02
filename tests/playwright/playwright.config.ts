import { defineConfig, devices } from "@playwright/test";

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
};

/**
 * Playwright configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI ?? false),
  retries: process.env.CI === "true" ? 2 : 0,
  workers: process.env.CI === "true" ? 5 : undefined,
  reporter: "html",
  use: {
    baseURL: TEST_CONFIG.BASE_URL,
    trace: process.env.CI === "true" ? "on" : "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
      AUTH_DIRECTORY_URL: "https://login.microsoftonline.com/test-tenant-id",
      AUTH_CLIENT_ID: "test-client-id",
      AUTH_CLIENT_SECRET: "test-client-secret",
      AUTH_REDIRECT_URI: "http://localhost:3000/auth/callback",
      AUTH_POST_LOGOUT_URI: "http://localhost:3000",
      INQUESTS_API_URL:
        "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk",
      MOCK_OAUTH_URL: "http://localhost:4001",
    },
  },
});
