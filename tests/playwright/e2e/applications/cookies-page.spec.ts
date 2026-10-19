import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";

test.use({ storageState: { cookies: [], origins: [] } });

const cookiesUrl = "/cookies";

test.describe("View certificate page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("should have the correct header", async ({ page }) => {
    await page.goto(cookiesUrl);

    await expect(
      page.locator("h1.govuk-heading-l", { hasText: "Cookies" }),
    ).toBeVisible();
  });
});
