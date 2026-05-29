/**
 * Test Server with MSW Integration
 *
 * This script starts the actual Express application with MSW enabled for E2E testing.
 * It initializes MSW to intercept outgoing API calls and serve mock responses.
 */

import { setupServer } from "msw/node";
import { handlers } from "#tests/playwright/factories/handlers/index.js";

// Initialize MSW before importing the app
const mswServer = setupServer(...handlers);

// Constants for configuration
const TEST_PORT = "3000";
const SUCCESS_EXIT_CODE = 0;
const ERROR_EXIT_CODE = 1;

// Enable request interception with simple warning for unhandled requests
mswServer.listen({
  onUnhandledRequest: (req: Request, print: { warning: () => void }): void => {
    print.warning();
  },
});
console.log("🎭 MSW server started - intercepting outbound requests");

// Set environment variables for the Express app
process.env.NODE_ENV = "test";
process.env.PORT = TEST_PORT;
process.env.SESSION_SECRET = "test-secret-key";
process.env.SESSION_NAME = "test-session";
process.env.SERVICE_NAME = "Inquests";
process.env.AUTH_AUTHORITY_URL =
  "https://login.microsoftonline.com/test-tenant-id";
process.env.AUTH_CLIENT_ID = "test-client-id";
process.env.AUTH_CLIENT_SECRET = "test-client-secret";
process.env.AUTH_REDIRECT_URI = "http://localhost:3000/auth/callback";
process.env.AUTH_POST_LOGOUT_URI = "http://localhost:3000";
process.env.INQUESTS_API_URL = "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk";

// Test-only session-seed route — plants userId into session without going through auth
// Only registered when NODE_ENV === 'test'

// Now import and start the actual Express application
const appModulePath = "#public/app.js";

import(appModulePath)
  .then(() => {
    console.log(
      "✅ Express application started successfully with MSW integration",
    );
  })
  .catch((error: unknown) => {
    console.error("💥 Failed to start Express application:", error);
    console.log('📝 Make sure to run "yarn build" first');
    console.log("📝 Expected file location: public/app.js");
    process.exit(ERROR_EXIT_CODE);
  });

const gracefulShutdown = (signal: string): void => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  mswServer.close();
  process.exit(SUCCESS_EXIT_CODE);
};

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: unknown) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(ERROR_EXIT_CODE);
});

process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(ERROR_EXIT_CODE);
  },
);
