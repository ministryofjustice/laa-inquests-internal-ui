import { expect, test } from "@playwright/test";

const BUFFER_SECONDS = 60;
const EFFECTIVE_SECONDS = 2;
const MILLISECONDS_IN_A_SECOND = 1000;
const HTTP_FOUND = 302;

// This journey logs in with its own short-lived expiry, so it must not reuse
// the shared authenticated storage state.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Session expiry", () => {
  test("redirects to the login route once the session cookie has expired", async ({
    page,
  }) => {
    // Seed the test session with a short expiry (buffer + a small effective window).
    await page.goto(
      `/auth/test-login?tokenExpirySeconds=${BUFFER_SECONDS + EFFECTIVE_SECONDS}`,
    );
    await page.waitForURL("/");
    await expect(page).toHaveTitle(/Inquests – GOV.UK/);

    await page.waitForTimeout(
      (EFFECTIVE_SECONDS + 1) * MILLISECONDS_IN_A_SECOND,
    );

    // MSAL is unavailable in the test env, so assert the protected route's
    // immediate redirect to the internal login route without following it.
    const response = await page.request.get("/", { maxRedirects: 0 });

    expect(response.status()).toBe(HTTP_FOUND);
    expect(response.headers().location).toBe("/auth/login");
  });
});
