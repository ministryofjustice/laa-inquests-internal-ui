import { test, expect } from "../fixtures/index.js";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Cookies banner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("should display the banner content and cookie options", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto("/");

    const banner = page.getByRole("region", {
      name: "Cookies on inquests",
    });

    await expect(banner).toBeVisible();
    await expect(
      banner.getByText(
        "We use some essential cookies to make this service work.",
      ),
    ).toBeVisible();
    await expect(
      banner.getByText(
        "We’d like to set additional cookies so we can remember your settings, understand how people use the service and make improvements.",
      ),
    ).toBeVisible();
    await expect(
      banner.getByRole("button", { name: "Accept additional cookies" }),
    ).toBeVisible();
    await expect(
      banner.getByRole("button", { name: "Reject additional cookies" }),
    ).toBeVisible();
    await expect(
      banner.getByRole("link", { name: "View cookies" }),
    ).toHaveAttribute("href", "/cookies?returnTo=%2F");

    await checkAccessibility();
  });

  test("should navigate to cookie settings from the banner", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View cookies" }).click();

    await expect(page).toHaveURL("/cookies?returnTo=%2F");
    await expect(
      page.getByRole("heading", { name: "Cookies", level: 1, exact: true }),
    ).toBeVisible();
  });
});
