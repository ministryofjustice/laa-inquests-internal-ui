import { test, expect } from "../fixtures/index.js";

test.use({ storageState: { cookies: [], origins: [] } });

const cookiesUrl = "/cookies";

test.describe("View cookies page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("should have the correct title", async ({ page }) => {
    await page.goto(cookiesUrl);

    await expect(page).toHaveTitle(/Inquests – GOV.UK/);
  });

  test("should display the page heading", async ({ page }) => {
    await page.goto(cookiesUrl);

    await expect(
      page.locator("h1.govuk-heading-l", { hasText: "Cookies" }),
    ).toBeVisible();
  });

  test("should display the essential cookies table", async ({ page }) => {
    await page.goto(cookiesUrl);

    await expect(
      page.locator("h2.govuk-heading-m", { hasText: "Essential cookies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Essential cookies we use" }),
    ).toBeVisible();
  });

  test("should display the analytics cookies section and radios", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(cookiesUrl);

    await expect(
      page.locator("h2.govuk-heading-m", {
        hasText: "Analytics cookies (optional)",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", {
        name: "Do you want to accept analytics cookies?",
      }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: "Yes" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "No" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save cookie settings" }),
    ).toBeVisible();

    await checkAccessibility();
  });
});
