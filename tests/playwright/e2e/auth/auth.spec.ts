import { test, expect } from "../../fixtures/index.js";

const AUTH_AUTHORITY_URL = "https://login.microsoftonline.com/test-tenant-id";

test("redirects unauthenticated user to Entra on GET /auth/login", async ({
  page,
}) => {
  const response = await page.goto("/auth/login", { waitUntil: "commit" });

  expect(response?.url()).toContain(AUTH_AUTHORITY_URL);
});

test("renders home page when authenticated and session has UserId", async ({
  page,
}) => {
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
