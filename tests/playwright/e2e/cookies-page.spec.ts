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

    await expect(page).toHaveTitle(
      "Cookies – Manage inquest legal aid – GOV.UK",
    );
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

  for (const choice of ["Yes", "No"]) {
    test(`should close the cookie banner after saving "${choice}"`, async ({
      page,
    }) => {
      const banner = page.getByRole("region", {
        name: "Cookies on manage inquest legal aid",
      });
      await page.goto(cookiesUrl);
      await expect(banner).toBeVisible();

      await page.getByRole("radio", { name: choice }).check();
      await page.getByRole("button", { name: "Save cookie settings" }).click();

      await expect(page.getByRole("radio", { name: choice })).toBeChecked();
      await expect(banner).toBeHidden();
    });
  }

  test("should have success banner link to previous page", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("link", { name: "Cookies", exact: true }).click();
    await expect(page).toHaveURL(cookiesUrl);

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

  test("should successfully update user preference after updating cookies preferences", async ({
    page,
  }) => {
    await page.goto(cookiesUrl);

    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save cookie settings" }).click();

    await expect(page.getByRole("radio", { name: "Yes" })).toBeChecked();

    await page.getByRole("radio", { name: "No" }).check();
    await page.getByRole("button", { name: "Save cookie settings" }).click();

    await expect(page.getByRole("radio", { name: "No" })).toBeChecked();
  });

  test("handles the browser blocking cookie preferences", async ({
    page,
    context,
  }) => {
    // Simulate a browser that silently drops every Set-Cookie header
    await page.route("**/cookies", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const response = await route.fetch({ maxRedirects: 0 });

      await context.clearCookies({ name: "cookies_policy" });
      const headers = response
        .headersArray()
        .filter(({ name }) => name.toLowerCase() !== "set-cookie")
        .reduce<Record<string, string>>(
          (acc, { name, value }) => ({ ...acc, [name]: value }),
          {},
        );
      await route.fulfill({ response, headers });
    });

    await page.goto("/cookies");
    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save cookie settings" }).click();

    // assert the graceful behaviour you want here
    expect(
      (await page.context().cookies()).find((c) => c.name === "cookies_policy"),
    ).toBeUndefined();

    await expect(
      page.locator("div.govuk-notification-banner", {
        hasText: "You’ve set your cookie preferences.",
      }),
    ).not.toBeVisible();
  });

  test("Selects No by default if no cookie is set", async ({
    page,
    context,
  }) => {
    await context.clearCookies({ name: "cookies_policy" });

    await page.goto(cookiesUrl);

    await expect(page.getByRole("radio", { name: "No" })).toBeChecked();
  });
});
