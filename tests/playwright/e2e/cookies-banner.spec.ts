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
        .getByRole("region", { name: "Cookies on inquests" })
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
        name: "Cookies on inquests",
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
