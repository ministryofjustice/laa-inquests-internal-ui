import { test, expect } from "../../fixtures/index.js";

const MOCK_OAUTH_URL = process.env.MOCK_OAUTH_URL ?? "http://localhost:4001";

test("completes full login flow via mock OAuth provider", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto("/auth/login");
  await page.waitForURL("/");

  await expect(page).toHaveTitle(/Inquests – GOV.UK/);
});

test("renders home page when authenticated", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Inquests – GOV.UK/);
});

test("logout clears the session and redirects to post-logout URI", async ({
  page,
}) => {
  const response = await page.request.get("/auth/logout", { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain("http://localhost:3000");
});

test("redirects unauthenticated user to Entra on GET /auth/login", async ({
  page,
}) => {
  const response = await page.request.get("/auth/login", { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain(MOCK_OAUTH_URL);
});
