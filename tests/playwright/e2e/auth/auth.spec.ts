import { test, expect } from "../../fixtures/index.js";

test("completes full login flow via Entra provider", async ({ page }) => {
  await page.context().clearCookies({ domain: "localhost" });

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
  expect(response.headers()["location"]).toContain(
    encodeURIComponent("http://localhost:3000"),
  );
});

test("redirects unauthenticated user to Entra on GET /auth/login", async ({
  page,
}) => {
  const response = await page.request.get("/auth/login", { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain("login.microsoftonline.com");
});
