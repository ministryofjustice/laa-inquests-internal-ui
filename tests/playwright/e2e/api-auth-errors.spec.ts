import { test, expect } from "../fixtures/index.js";
import {
  FORBIDDEN_APPLICATION_REFERENCE,
  UNAUTHORISED_APPLICATION_REFERENCE,
} from "#tests/playwright/factories/handlers/authErrors.js";
import {
  HTTP_OK,
  HTTP_FOUND,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
} from "#tests/playwright/constants/httpStatus.js";

const VALID_APPLICATION_REFERENCE = "INQ-YYY-001";

const overviewPath = (laaReference: string): string =>
  `/applications/${laaReference}/overview`;

// A 401 destroys the session server side, so this journey signs in on its own
// session rather than sharing the suite's stored authentication state.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("API auth errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("still renders an application when the API authorises the request", async ({
    page,
  }) => {
    const response = await page.request.get(
      overviewPath(VALID_APPLICATION_REFERENCE),
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(HTTP_OK);
  });

  test("redirects to the login route when the API returns 401", async ({
    page,
  }) => {
    const response = await page.request.get(
      overviewPath(UNAUTHORISED_APPLICATION_REFERENCE),
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(HTTP_FOUND);
    expect(response.headers().location).toBe("/auth/login?sessionExpired=true");
  });

  test("destroys the session when the API returns 401", async ({ page }) => {
    await page.request.get(overviewPath(UNAUTHORISED_APPLICATION_REFERENCE), {
      maxRedirects: 0,
    });

    const followUpResponse = await page.request.get("/", { maxRedirects: 0 });

    expect(followUpResponse.status()).toBe(HTTP_FOUND);
    expect(followUpResponse.headers().location).toBe("/auth/login");
  });

  test("does not redirect again when the request has already been redirected once", async ({
    page,
  }) => {
    const response = await page.request.get(
      `${overviewPath(UNAUTHORISED_APPLICATION_REFERENCE)}?sessionExpired=true`,
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    expect(response.headers().location).toBeUndefined();
    expect(await response.text()).toContain("Internal Server Error");
  });

  test("renders the forbidden error page when the API returns 403", async ({
    page,
  }) => {
    const response = await page.goto(
      overviewPath(FORBIDDEN_APPLICATION_REFERENCE),
    );

    expect(response?.status()).toBe(HTTP_FORBIDDEN);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("403");
    await expect(page.getByText("Forbidden")).toBeVisible();
    expect(page.url()).toContain(overviewPath(FORBIDDEN_APPLICATION_REFERENCE));
  });

  test("forbidden error page is accessible", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(overviewPath(FORBIDDEN_APPLICATION_REFERENCE));

    await checkAccessibility();
  });
});
