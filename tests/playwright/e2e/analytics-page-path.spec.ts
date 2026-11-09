import { test, expect } from "../fixtures/index.js";
import {
  FAILED_HISTORY_REFERENCE,
  FORBIDDEN_HISTORY_REFERENCE,
  MISSING_APPLICATION_REFERENCE,
} from "#tests/playwright/factories/handlers/applicationOverviewErrors.js";

const applicationOverviewPath = (reference: string): string =>
  `/applications/${reference}/overview`;
const NORMAL_APPLICATION_REFERENCE = "INQ-YYY-001";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Analytics page paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("reports a successful non-dynamic page", async ({ page }) => {
    await page.route("https://www.googletagmanager.com/**", async (route) => {
      await route.abort();
    });
    await page.goto("/");
    const configuration = await page.evaluate(() => {
      const { dataLayer = [] } = window as Window & {
        dataLayer?: unknown[][];
      };
      return Array.from(dataLayer, (entry) => Array.from(entry)).find(
        (entry) => entry[0] === "config",
      );
    });
    const origin = new URL(page.url()).origin;

    expect(configuration?.[2]).toEqual({
      page_location: `${origin}/`,
    });
  });

  test("normalizes a successful dynamic page and preserves the query string", async ({
    page,
    checkAccessibility,
  }) => {
    await page.route("https://www.googletagmanager.com/**", async (route) => {
      await route.abort();
    });
    const query = "?utm_source=analytics-test&search=example%20query";
    const response = await page.goto(
      `${applicationOverviewPath(NORMAL_APPLICATION_REFERENCE)}${query}`,
    );
    const configuration = await page.evaluate(() => {
      const { dataLayer = [] } = window as Window & {
        dataLayer?: unknown[][];
      };
      return Array.from(dataLayer, (entry) => Array.from(entry)).find(
        (entry) => entry[0] === "config",
      );
    });
    const origin = new URL(page.url()).origin;

    expect(configuration?.[2]).toEqual({
      page_location: `${origin}/applications/:laaReference/overview${query}`,
    });
    expect(await response?.text()).toMatch(
      /window\.location\.origin\s*\+\s*['"]\/applications\/:laaReference\/overview['"]\s*\+\s*window\.location\.search/,
    );
    await checkAccessibility();
  });

  for (const { status, reference } of [
    { status: 403, reference: FORBIDDEN_HISTORY_REFERENCE },
    { status: 404, reference: MISSING_APPLICATION_REFERENCE },
    { status: 500, reference: FAILED_HISTORY_REFERENCE },
  ]) {
    test(`reports a virtual ${status} path and the normalized attempted route`, async ({
      page,
    }) => {
      await page.goto(applicationOverviewPath(reference));
      const configuration = await page.evaluate(() => {
        const { dataLayer = [] } = window as Window & {
          dataLayer?: unknown[][];
        };
        return Array.from(dataLayer, (entry) => Array.from(entry)).find(
          (entry) => entry[0] === "config",
        );
      });
      const origin = new URL(page.url()).origin;

      expect(configuration?.[2]).toEqual({
        page_location: `${origin}/errors/${status}`,
        attempted_route: "/applications/:laaReference/overview",
      });
    });
  }
});
