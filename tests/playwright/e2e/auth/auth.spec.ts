import { test, expect } from "../../fixtures/index.js";

test("redirects unauthenticated user to login page", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "commit" });

  expect(response?.url()).toContain("/auth/login");
});
