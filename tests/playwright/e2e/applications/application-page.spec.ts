import { test, expect } from "../fixtures/index.js";

test("homepage should have the correct title", async ({ page }) => {
  // Navigate to the homepage
  await page.goto("/application/123");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Application",
  );

  // Check for the title of the application
  await expect(page).toHaveTitle(/Inquests – GOV.UK/);
});
