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
    const banner = page.getByRole("region", { name: "Cookies on inquests" });
    await expect(banner).toContainText("You've rejected additional cookies.");
    await expect(page.locator(".govuk-error-summary")).toBeHidden();
    await page.reload();
    await expect(banner).toBeHidden();
  });

  test("should use the default analytics cookie configuration", async ({
    page,
  }) => {
    await page.route("https://www.googletagmanager.com/gtag/js**", (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
    await page.reload();

    const analyticsConfig = await page.evaluate(() => {
      const commands: unknown = Reflect.get(window, "dataLayer");
      if (!Array.isArray(commands)) {
        throw new Error("Analytics command queue is missing");
      }
      return commands
        .map((command: ArrayLike<unknown>) => Array.from(command))
        .find((command) => command[0] === "config");
    });

    expect(analyticsConfig).toEqual(["config", expect.any(String)]);
  });

  test("should remove existing analytics cookies when a banner rejection replaces acceptance", async ({
    page,
    context,
  }) => {
    await page
      .getByRole("button", { name: "Accept additional cookies" })
      .click();
    await page.reload();
    await page.getByRole("link", { name: "Cookies", exact: true }).click();
    const csrfToken = await page
      .locator('form[action="/cookies"] input[name="_csrf"]')
      .inputValue();
    const url = page.url();
    const analyticsCookieNames = ["_ga", "_ga_TEST", "_gid", "_gat"];
    await context.addCookies(
      analyticsCookieNames.map((name) => ({
        name,
        value: "existing-analytics-cookie",
        url,
      })),
    );
    const essentialCookies = (await context.cookies()).filter(
      (cookie) => cookie.httpOnly && cookie.name !== "cookies_policy",
    );

    const response = await page.request.post("/cookies/banner", {
      form: {
        _csrf: csrfToken,
        "cookies[additional]": "no",
        returnTo: "/",
      },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);

    await page.goto("/");
    const cookies = await context.cookies();
    expect(
      cookies.filter((cookie) =>
        /^(?:_ga(?:_.+)?|_gid|_gat(?:_.+)?)$/v.test(cookie.name),
      ),
    ).toEqual([]);
    for (const essentialCookie of essentialCookies) {
      expect(
        cookies.find((cookie) => cookie.name === essentialCookie.name)?.value,
      ).toBe(essentialCookie.value);
    }
    await expect(
      page.getByRole("region", { name: "Cookies on inquests" }),
    ).toContainText("You've rejected additional cookies.");
  });

  test("should not reuse an older acceptance when saving rejection fails", async ({
    page,
    context,
  }) => {
    const csrfToken = await page
      .locator('form[action="/cookies/banner"] input[name="_csrf"]')
      .inputValue();
    await page
      .getByRole("button", { name: "Accept additional cookies" })
      .click();
    const oldPolicy = (await context.cookies()).find(
      (cookie) => cookie.name === "cookies_policy",
    );
    assert.ok(oldPolicy);
    await page.request.post("/cookies/banner", {
      form: {
        _csrf: csrfToken,
        "cookies[additional]": "no",
        returnTo: "/reports",
      },
      maxRedirects: 0,
    });
    await context.addCookies([oldPolicy]);

    for (const url of ["/reports", "/"]) {
      await page.goto(url);
      await expect(
        page.getByRole("button", { name: "Reject additional cookies" }),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          Object.entries(window)
            .filter(([key]) => key.startsWith("ga-disable-"))
            .map(([, value]) => value),
        ),
      ).toEqual([true]);
    }
    await page
      .getByRole("button", { name: "Reject additional cookies" })
      .click();
    await expect(
      page.getByRole("region", { name: "Cookies on inquests" }),
    ).toContainText("You've rejected additional cookies.");
  });

  for (const { buttonName, hasTrackingConsent } of [
    { buttonName: "Accept additional cookies", hasTrackingConsent: true },
    { buttonName: "Reject additional cookies", hasTrackingConsent: false },
  ]) {
    const outcome = hasTrackingConsent ? "accepted" : "rejected";

    test(`should keep the banner visible when the ${outcome} preference was not stored`, async ({
      page,
      context,
      checkAccessibility,
    }) => {
      const csrfToken = await page
        .locator('form[action="/cookies/banner"] input[name="_csrf"]')
        .inputValue();
      await page.request.post("/cookies/banner", {
        form: {
          _csrf: csrfToken,
          "cookies[additional]": hasTrackingConsent ? "yes" : "no",
          returnTo: "/reports",
        },
        maxRedirects: 0,
      });
      // Preserve authentication while simulating refusal of the preference cookie.
      await context.clearCookies({ name: "cookies_policy" });

      await page.goto("/reports");
      const banner = page.getByRole("region", {
        name: "Cookies on inquests",
      });
      await expect(
        banner.getByRole("button", { name: "Accept additional cookies" }),
      ).toBeVisible();
      await expect(
        banner.getByRole("button", { name: "Reject additional cookies" }),
      ).toBeVisible();
      await expect(banner).not.toContainText(`You've ${outcome}`);
      expect(
        await page.evaluate(() =>
          Object.entries(window)
            .filter(([key]) => key.startsWith("ga-disable-"))
            .map(([, value]) => value),
        ),
      ).toEqual([true]);
      await checkAccessibility();
      await page.reload();
      await expect(
        banner.getByRole("button", { name: "Accept additional cookies" }),
      ).toBeVisible();
      await banner.getByRole("button", { name: buttonName }).click();
      await expect(banner).toContainText(
        `You've ${outcome} additional cookies.`,
      );
      await page.reload();
      await expect(banner).toBeHidden();
    });

    test(`should show the banner and allow ${outcome} consent after the old preference expires`, async ({
      page,
      context,
    }) => {
      await page
        .getByRole("button", { name: "Accept additional cookies" })
        .click();
      const cookies = await context.cookies();
      const policy = cookies.find((cookie) => cookie.name === "cookies_policy");
      assert.ok(policy);
      await context.addCookies([
        {
          ...policy,
          expires: Math.floor(Date.now() / MILLISECONDS_IN_A_SECOND) - 1,
        },
      ]);

      await page.goto("/reports");
      const banner = page.getByRole("region", {
        name: "Cookies on inquests",
      });
      await expect(
        banner.getByRole("button", { name: buttonName }),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          Object.entries(window)
            .filter(([key]) => key.startsWith("ga-disable-"))
            .map(([, value]) => value),
        ),
      ).toEqual([true]);
      await banner.getByRole("button", { name: buttonName }).click();
      await expect(banner).toContainText(
        `You've ${outcome} additional cookies.`,
      );
      const updatedPolicy = (await context.cookies()).find(
        (cookie) => cookie.name === "cookies_policy",
      );
      assert.ok(updatedPolicy);
      expect(JSON.parse(decodeURIComponent(updatedPolicy.value))).toEqual({
        has_tracking_consent: hasTrackingConsent,
      });
    });

    test(`should show and dismiss the ${outcome} cookie confirmation`, async ({
      page,
      context,
      checkAccessibility,
    }) => {
      await page.goto("/reports");
      await page.getByRole("button", { name: buttonName }).click();

      const banner = page.getByRole("region", {
        name: "Cookies on inquests",
      });
      await expect(page).toHaveURL("/reports");
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(
        `You've ${outcome} additional cookies. You can change your cookie settings at anytime.`,
      );
      await expect(
        banner.getByRole("link", { name: "change your cookie settings" }),
      ).toHaveAttribute("href", "/cookies?returnTo=%2Freports");
      await expect(
        banner.getByRole("button", { name: "Accept additional cookies" }),
      ).toBeHidden();
      await expect(
        banner.getByRole("button", { name: "Reject additional cookies" }),
      ).toBeHidden();
      await checkAccessibility();

      const cookiesBeforeHiding = await context.cookies();
      const policyBeforeHiding = cookiesBeforeHiding.find(
        (cookie) => cookie.name === "cookies_policy",
      );
      assert.ok(policyBeforeHiding);

      await banner.getByRole("button", { name: "Hide cookie message" }).click();
      await expect(page).toHaveURL("/reports");
      await expect(banner).toBeHidden();
      const cookiesAfterHiding = await context.cookies();
      expect(
        cookiesAfterHiding.find((cookie) => cookie.name === "cookies_policy"),
      ).toEqual(policyBeforeHiding);

      await page.reload();
      await expect(banner).toBeHidden();
    });

    test(`should navigate to cookie settings from the ${outcome} confirmation`, async ({
      page,
    }) => {
      await page.goto("/reports");
      await page.getByRole("button", { name: buttonName }).click();

      await page
        .getByRole("region", { name: "Cookies on inquests" })
        .getByRole("link", { name: "change your cookie settings" })
        .click();

      await expect(page).toHaveURL("/cookies?returnTo=%2Freports");
      await expect(
        page.getByRole("heading", {
          name: "Cookies",
          level: 1,
          exact: true,
        }),
      ).toBeVisible();
    });

    test(`should save ${buttonName.toLowerCase()} for one year and hide the banner on subsequent pages`, async ({
      page,
      context,
    }) => {
      await page.goto("/reports");
      const essentialCookies = (await context.cookies()).filter(
        (cookie) => cookie.httpOnly && cookie.name !== "cookies_policy",
      );
      expect(essentialCookies.length).toBeGreaterThan(0);
      const csrfToken = await page
        .locator('form[action="/cookies/banner"] input[name="_csrf"]')
        .inputValue();

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
      for (const essentialCookie of essentialCookies) {
        expect(
          cookies.find((cookie) => cookie.name === essentialCookie.name)?.value,
        ).toBe(essentialCookie.value);
      }

      await expect(page).toHaveURL("/reports");
      await page.reload();
      await expect(banner).toBeHidden();

      await page.goto("/");
      await expect(banner).toBeHidden();
      await expect(page).toHaveTitle(/Inquests – GOV.UK/);
      const response = await page.request.post("/cookies/banner/hide", {
        form: { _csrf: csrfToken, returnTo: "/reports" },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe("/reports");
    });
  }
});
