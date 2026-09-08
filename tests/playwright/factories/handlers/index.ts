/**
 * MSW Handlers Index
 *
 * Composes all domain-specific handlers into a single array for MSW server.
 * Following MSW best practices for modular handler organization.
 *
 * @see https://mswjs.io/docs/best-practices/structuring-handlers
 */

import { http, HttpResponse } from "msw";
import { applicationHandlers } from "#tests/playwright/factories/handlers/applications.js";
import { authErrorHandlers } from "#tests/playwright/factories/handlers/authErrors.js";

const debugHandler = http.all("*", () => {
  // Return undefined to pass through to actual handlers
});

/**
 * Combined handlers array
 * Using the comprehensive API handlers that match the application's real API calls
 */
export const handlers = [
  debugHandler,
  // authErrorHandlers must precede applicationHandlers: MSW resolves the first matching handler and
  // these specific references would otherwise be caught by /applications/:id.
  ...authErrorHandlers,
  ...applicationHandlers,

  // Health check endpoint for testing
  http.get("/health", () =>
    HttpResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      msw: "active",
    }),
  ),
];
