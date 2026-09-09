import { test, expect } from "../../fixtures/index.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  FAILED_APPLICATION_REFERENCE,
  FAILED_CORONERS_LETTER_REFERENCE,
  FAILED_HISTORY_REFERENCE,
  FORBIDDEN_CORONERS_LETTER_REFERENCE,
  FORBIDDEN_HISTORY_REFERENCE,
  INVALID_APPLICATION_REFERENCE,
  MISSING_CORONERS_LETTER_REFERENCE,
  UNAUTHORISED_CORONERS_LETTER_REFERENCE,
  UNAUTHORISED_HISTORY_REFERENCE,
} from "#tests/playwright/factories/handlers/applicationOverviewErrors.js";

const HTTP_FOUND = 302;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const overviewPath = (laaReference: string): string =>
  `/applications/${laaReference}/overview`;

const coronersLetterPath = (laaReference: string): string =>
  `/applications/${laaReference}/coroners-letter`;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Application overview errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("shows the generic error page when application retrieval fails", async ({
    page,
  }) => {
    const response = await page.goto(
      overviewPath(FAILED_APPLICATION_REFERENCE),
    );

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(
      page.getByText(en.pages.error.internalServerError),
    ).toBeVisible();
  });

  test("does not expose validation details for malformed application data", async ({
    page,
  }) => {
    const response = await page.goto(
      overviewPath(INVALID_APPLICATION_REFERENCE),
    );

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(page.getByText(/invalid_type|ZodError/)).toHaveCount(0);
  });

  test("redirects to login when history retrieval returns 401", async ({
    page,
  }) => {
    const response = await page.request.get(
      overviewPath(UNAUTHORISED_HISTORY_REFERENCE),
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(HTTP_FOUND);
    expect(response.headers().location).toBe("/auth/login?sessionExpired=true");
  });

  test("shows the forbidden page when history retrieval returns 403", async ({
    page,
  }) => {
    const response = await page.goto(overviewPath(FORBIDDEN_HISTORY_REFERENCE));

    expect(response?.status()).toBe(HTTP_FORBIDDEN);
    await expect(page.getByRole("heading", { name: "403" })).toBeVisible();
  });

  test("shows the generic error page when history retrieval fails", async ({
    page,
  }) => {
    const response = await page.goto(overviewPath(FAILED_HISTORY_REFERENCE));

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
  });

  test("redirects to login when coroner letter retrieval returns 401", async ({
    page,
  }) => {
    const response = await page.request.get(
      coronersLetterPath(UNAUTHORISED_CORONERS_LETTER_REFERENCE),
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(HTTP_FOUND);
    expect(response.headers().location).toBe("/auth/login?sessionExpired=true");
  });

  test("shows the forbidden page when coroner letter retrieval returns 403", async ({
    page,
  }) => {
    const response = await page.goto(
      coronersLetterPath(FORBIDDEN_CORONERS_LETTER_REFERENCE),
    );

    expect(response?.status()).toBe(HTTP_FORBIDDEN);
    await expect(page.getByRole("heading", { name: "403" })).toBeVisible();
  });

  test("shows an accessible not-found page when the coroner letter does not exist", async ({
    page,
    checkAccessibility,
  }) => {
    const response = await page.goto(
      coronersLetterPath(MISSING_CORONERS_LETTER_REFERENCE),
    );

    expect(response?.status()).toBe(HTTP_NOT_FOUND);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(
      page.getByText(
        "The coroner's letter for this application could not be found.",
      ),
    ).toBeVisible();
    await checkAccessibility();
  });

  test("shows the generic error page when coroner letter retrieval fails", async ({
    page,
  }) => {
    const response = await page.goto(
      coronersLetterPath(FAILED_CORONERS_LETTER_REFERENCE),
    );

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(
      page.getByText(en.pages.error.internalServerError),
    ).toBeVisible();
  });
});
