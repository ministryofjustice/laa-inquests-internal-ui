import { strict as assert } from "assert";
import { test, expect } from "../fixtures/index.js";

const COOKIE_PREFERENCE_LIFETIME_SECONDS = 365 * 24 * 60 * 60;
const MILLISECONDS_IN_A_SECOND = 1000;

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

  test("should reject cookie preference submissions without a CSRF token", async ({
    page,
    context,
  }) => {
    const response = await page.request.post("/cookies/banner", {
      form: {
        "cookies[additional]": "yes",
        returnTo: "/",
      },
    });

    await expect(response).not.toBeOK();
    const cookies = await context.cookies();
    expect(
      cookies.find((cookie) => cookie.name === "cookies_policy"),
    ).toBeUndefined();

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Cookies on inquests" }),
    ).toBeVisible();
  });

  test("should save disabled consent and return to the current page for an unexpected choice", async ({
    page,
    context,
  }) => {
    await page.goto("/reports");
    const bannerForm = page.locator('form[action="/cookies/banner"]');
    const csrfToken = await bannerForm
      .locator('input[name="_csrf"]')
      .inputValue();

    const response = await page.request.post("/cookies/banner", {
      form: {
        _csrf: csrfToken,
        "cookies[additional]": "unexpected",
        returnTo: "/reports",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("/reports");
    const cookies = await context.cookies();
    const policy = cookies.find((cookie) => cookie.name === "cookies_policy");
    assert.ok(policy);
    expect(JSON.parse(decodeURIComponent(policy.value))).toEqual({
      has_tracking_consent: false,
    });

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Cookies on inquests" }),
    ).toBeHidden();
    await expect(page.locator(".govuk-error-summary")).toBeHidden();
  });

  for (const { buttonName, hasTrackingConsent } of [
    { buttonName: "Accept additional cookies", hasTrackingConsent: true },
    { buttonName: "Reject additional cookies", hasTrackingConsent: false },
  ]) {
    test(`should save ${buttonName.toLowerCase()} for one year and hide the banner on subsequent pages`, async ({
      page,
      context,
    }) => {
      await page.goto("/reports");

      const banner = page.getByRole("region", {
        name: "Cookies on inquests",
      });
      const earliestExpiry =
        Math.floor(Date.now() / MILLISECONDS_IN_A_SECOND) +
        COOKIE_PREFERENCE_LIFETIME_SECONDS;

      await banner.getByRole("button", { name: buttonName }).click();

      await expect
        .poll(async () => {
          const cookies = await context.cookies();
          return cookies.find((cookie) => cookie.name === "cookies_policy");
        })
        .toBeDefined();

      const latestExpiry =
        Math.ceil(Date.now() / MILLISECONDS_IN_A_SECOND) +
        COOKIE_PREFERENCE_LIFETIME_SECONDS;
      const cookies = await context.cookies();
      const policy = cookies.find((cookie) => cookie.name === "cookies_policy");

      assert.ok(policy, "The cookie preference should be saved");
      expect(JSON.parse(decodeURIComponent(policy.value))).toEqual({
        has_tracking_consent: hasTrackingConsent,
      });
      expect(policy.expires).toBeGreaterThanOrEqual(earliestExpiry);
      expect(policy.expires).toBeLessThanOrEqual(latestExpiry);
      expect(policy.path).toBe("/");

      await expect(page).toHaveURL("/reports");
      await page.reload();
      await expect(banner).toBeHidden();

      await page.goto("/");
      await expect(banner).toBeHidden();
      await expect(page).toHaveTitle(/Inquests – GOV.UK/);
    });
  }
});
