import { test, expect } from "../../fixtures/index.js";

const AUTH_AUTHORITY_URL ="https://login.microsoftonline.com/test-tenant-id";

test("redirects unauthenticated user to login page", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain("/auth/login");
});

test("redirects to Entra on GET /auth/login", async ({ page }) => {
  const response = await page.goto("/auth/login", { waitUntil: "commit" });

  expect(response?.url()).toContain(AUTH_AUTHORITY_URL);
});

test("renders home page when session contains userId", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
});

test("clears session and redirects on GET /auth/logout", async ({ page }) => {
  const logoutResponse = await page.request.get("/auth/logout", {
    maxRedirects: 0,
  });

  expect(logoutResponse.status()).toBe(302);

  const homeResponse = await page.request.get("/", { maxRedirects: 0 });
  expect(homeResponse.headers()["location"]).toContain("/auth/login");
});
