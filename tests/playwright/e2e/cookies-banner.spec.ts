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
      name: "Cookies on manage inquest legal aid",
    });

    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute(
      "aria-label",
      "Cookies on manage inquest legal aid",
    );
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
    ).toHaveAttribute("href", "/cookies");

    await checkAccessibility();
  });

  test("should navigate to cookie settings from the banner", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View cookies" }).click();

    await expect(page).toHaveURL("/cookies");
    await expect(
      page.getByRole("heading", { name: "Cookies", level: 1, exact: true }),
    ).toBeVisible();
  });

  for (const { buttonName, hasTrackingConsent } of [
    { buttonName: "Accept additional cookies", hasTrackingConsent: true },
    { buttonName: "Reject additional cookies", hasTrackingConsent: false },
  ]) {
    const outcome = hasTrackingConsent ? "accepted" : "rejected";

    test(`should remember the ${outcome} preference in a new browser session`, async ({
      page,
      context,
      browser,
      baseURL,
      checkPageAccessibility,
    }) => {
      await page.getByRole("button", { name: buttonName }).click();
      await expect(
        page.getByRole("region", {
          name: "Cookies on manage inquest legal aid",
        }),
      ).toContainText(`You've ${outcome} additional cookies.`);

      const cookies = await context.cookies();
      const policy = cookies.find((cookie) => cookie.name === "cookies_policy");
      const previousSession = cookies.find(
        (cookie) => cookie.name === "test-session",
      );
      assert.ok(policy);
      assert.ok(previousSession);
      expect(JSON.parse(decodeURIComponent(policy.value))).toEqual({
        has_tracking_consent: hasTrackingConsent,
      });
      expect(policy.expires).toBeGreaterThan(
        Date.now() / MILLISECONDS_IN_A_SECOND +
          COOKIE_PREFERENCE_LIFETIME_SECONDS -
          60,
      );

      // A restarted browser keeps the preference but not the old login session.
      const newContext = await browser.newContext({
        baseURL,
        storageState: { cookies: [policy], origins: [] },
      });
      try {
        expect(await newContext.cookies()).toEqual([policy]);
        const newPage = await newContext.newPage();
        const banner = newPage.getByRole("region", {
          name: "Cookies on manage inquest legal aid",
        });

        await newPage.goto("/auth/test-login");
        await expect(newPage).toHaveURL("/");
        await expect(banner).toBeHidden();
        expect(
          await newPage.evaluate(() =>
            Object.entries(window)
              .filter(([key]) => key.startsWith("ga-disable-"))
              .map(([, value]) => value),
          ),
        ).toEqual([!hasTrackingConsent]);
        await checkPageAccessibility(newPage);

        const newCookies = await newContext.cookies();
        const newSession = newCookies.find(
          (cookie) => cookie.name === "test-session",
        );
        assert.ok(newSession);
        expect(newSession.value).not.toBe(previousSession.value);
        expect(
          newCookies.find((cookie) => cookie.name === "cookies_policy"),
        ).toEqual(policy);

        await newPage.goto("/cookies");
        await expect(
          newPage.getByRole("heading", {
            name: "Cookies",
            level: 1,
            exact: true,
          }),
        ).toBeVisible();
        await expect(banner).toBeHidden();
        await newPage.goto("/reports");
        await expect(banner).toBeHidden();
        await newPage.reload();
        await expect(banner).toBeHidden();
      } finally {
        await newContext.close();
      }
    });

    test(`should remember the ${outcome} preference after signing out and back in`, async ({
      page,
      context,
      baseURL,
      checkAccessibility,
    }) => {
      assert.ok(baseURL);
      await page.getByRole("button", { name: buttonName }).click();
      const policy = (await context.cookies()).find(
        (cookie) => cookie.name === "cookies_policy",
      );
      assert.ok(policy);

      await page.route(
        "https://login.microsoftonline.com/common/oauth2/v2.0/logout?*",
        async (route) => {
          await route.fulfill({
            contentType: "text/html",
            body: `<!doctype html><a href="${new URL("/auth/test-login", baseURL).href}">Sign in again</a>`,
          });
        },
      );

      const logoutResponse = await page.request.get("/auth/logout", {
        maxRedirects: 0,
      });
      expect(logoutResponse.status()).toBe(302);
      const logoutUrl = logoutResponse.headers().location;
      assert.ok(logoutUrl);
      await page.goto(logoutUrl);
      await expect(
        page.getByRole("link", { name: "Sign in again" }),
      ).toBeVisible();
      const signedOutCookies = await context.cookies(baseURL);
      expect(
        signedOutCookies.find((cookie) => cookie.name === "test-session"),
      ).toBeUndefined();
      expect(
        signedOutCookies.find((cookie) => cookie.name === "cookies_policy"),
      ).toEqual(policy);

      await page.getByRole("link", { name: "Sign in again" }).click();
      await expect(page).toHaveURL("/");
      await expect(
        page.getByRole("heading", {
          name: "What do you need to do?",
          level: 1,
        }),
      ).toBeVisible();
      const banner = page.getByRole("region", {
        name: "Cookies on manage inquest legal aid",
      });
      await expect(banner).toBeHidden();
      expect(
        await page.evaluate(() =>
          Object.entries(window)
            .filter(([key]) => key.startsWith("ga-disable-"))
            .map(([, value]) => value),
        ),
      ).toEqual([!hasTrackingConsent]);
      await checkAccessibility();
      await page.reload();
      await expect(banner).toBeHidden();
    });

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
          acceptCookies: hasTrackingConsent ? "yes" : "no",
        },
        maxRedirects: 0,
      });
      // Preserve authentication while simulating refusal of the preference cookie.
      await context.clearCookies({ name: "cookies_policy" });

      await page.goto("/reports");
      const banner = page.getByRole("region", {
        name: "Cookies on manage inquest legal aid",
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
        name: "Cookies on manage inquest legal aid",
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
        name: "Cookies on manage inquest legal aid",
      });
      await expect(page).toHaveURL("/reports");
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(
        `You've ${outcome} additional cookies. You can change your cookie settings at any time.`,
      );
      await expect(
        banner.getByRole("link", { name: "change your cookie settings" }),
      ).toHaveAttribute("href", "/cookies");
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
        .getByRole("region", {
          name: "Cookies on manage inquest legal aid",
        })
        .getByRole("link", { name: "change your cookie settings" })
        .click();

      await expect(page).toHaveURL("/cookies");
      await expect(
        page.getByRole("heading", {
          name: "Cookies",
          level: 1,
          exact: true,
        }),
      ).toBeVisible();
    });

    test(`should save ${buttonName.toLowerCase()} and hide the banner on subsequent pages`, async ({
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
        name: "Cookies on manage inquest legal aid",
      });

      await banner.getByRole("button", { name: buttonName }).click();

      await expect
        .poll(async () => {
          const cookies = await context.cookies();
          return cookies.find((cookie) => cookie.name === "cookies_policy");
        })
        .toBeDefined();

      const cookies = await context.cookies();
      const policy = cookies.find((cookie) => cookie.name === "cookies_policy");

      assert.ok(policy, "The cookie preference should be saved");
      expect(JSON.parse(decodeURIComponent(policy.value))).toEqual({
        has_tracking_consent: hasTrackingConsent,
      });
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
      const response = await page.request.post("/cookies/banner/hide", {
        form: { _csrf: csrfToken },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe("/");
    });
  }
});
