import { test, expect } from "../fixtures/index.js";
import { HTTP_FORBIDDEN, HTTP_OK } from "../constants/httpStatus.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

const MIN_HSTS_MAX_AGE_SECONDS = 31536000;
const DECISION_PATH = "/applications/INQ-ABC-123/decision";

function expectSecurityHeaders(headers: Record<string, string>): void {
  const hsts = headers["strict-transport-security"];
  expect(hsts).toMatch(/max-age=(\d+)/);
  const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
  expect(maxAge).toBeGreaterThanOrEqual(MIN_HSTS_MAX_AGE_SECONDS);
  expect(hsts).toContain("includeSubDomains");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'self'",
  );
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
}

test.describe("Access control security headers", () => {
  // The session is shared across spec files, so restore full roles for later tests.
  test.afterEach(async ({ page }) => {
    await page.goto("/auth/test-login");
  });

  test("is denied access to a page with security headers when the role does not match", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(
      `/auth/test-login?overrideRoles=${INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER}`,
    );

    const response = await page.goto("/reports");

    expect(response?.status()).toBe(HTTP_FORBIDDEN);
    expectSecurityHeaders(response?.headers() ?? {});
    await expect(
      page.getByRole("heading", { name: "You cannot access this page" }),
    ).toBeVisible();
    await checkAccessibility();
  });

  test("is denied a form submission with security headers when the role does not match", async ({
    page,
  }) => {
    await page.goto(
      `/auth/test-login?overrideRoles=${INTERNAL_CASEWORKER_ROLES.FINANCE}`,
    );

    const response = await page.request.post(DECISION_PATH, {
      form: { decision: "grant" },
    });

    expect(response.status()).toBe(HTTP_FORBIDDEN);
    expectSecurityHeaders(response.headers());
  });

  test("includes a CSP nonce for scripts on a permitted page", async ({
    page,
  }) => {
    const response = await page.goto("/");

    expect(response?.status()).toBe(HTTP_OK);
    const headers = response?.headers() ?? {};
    expectSecurityHeaders(headers);
    expect(headers["content-security-policy"]).toMatch(
      /script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/,
    );
  });
});
