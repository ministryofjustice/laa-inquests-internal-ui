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

    await expect(page).toHaveTitle("Cookies – Inquests – GOV.UK");
  });

  test("should display the page heading", async ({ page }) => {
    await page.goto(cookiesUrl);

    await expect(
      page.locator("h1.govuk-heading-l", { hasText: "Cookies" }),
    ).toBeVisible();
  });

  test("should display the essential cookies section", async ({ page }) => {
    await page.goto(cookiesUrl);

    await expect(
      page.locator("h2.govuk-heading-m", { hasText: "Essential cookies" }),
    ).toBeVisible();
    await expect(page.getByTestId("essential-cookies-table")).toBeVisible();
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
    await expect(page.getByTestId("analytics-cookies-table")).toBeVisible();
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

  test("should display success banner on saving cookie settings", async ({
    page,
  }) => {
    await page.goto(cookiesUrl);

    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save cookie settings" }).click();

    await expect(
      page.locator("div.govuk-notification-banner", {
        hasText: "You’ve set your cookie preferences.",
      }),
    ).toBeVisible();
  });

  test("should have success banner link to previous page", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("link", { name: "Cookies" }).click();
    await expect(page).toHaveURL(cookiesUrl + "?returnTo=%2Freports");

    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save cookie settings" }).click();

    await expect(
      page.locator("div.govuk-notification-banner", {
        hasText: "You’ve set your cookie preferences.",
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Go back to the page you were looking at" })
      .click();
    await expect(page).toHaveURL("/reports");
  });

  test("should maintain selection after user saves", async ({ page }) => {
    await page.goto(cookiesUrl);

    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save cookie settings" }).click();

    await expect(page.getByRole("radio", { name: "Yes" })).toBeChecked();
  });
});
