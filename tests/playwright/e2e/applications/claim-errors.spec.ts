import { test, expect } from "../../fixtures/index.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  CLAIM_APPLICATION_REFERENCE,
  FAILED_CLAIM_ID,
  FAILED_EVIDENCE_ID,
  FAILED_REJECTION_CLAIM_ID,
  FORBIDDEN_CLAIM_ID,
  INVALID_CLAIM_ID,
  MISSING_CLAIM_ID,
  MISSING_EVIDENCE_ID,
  UNAUTHORISED_CLAIM_ID,
  UNAUTHORISED_EVIDENCE_ID,
} from "#tests/playwright/factories/handlers/claimErrors.js";

const HTTP_FOUND = 302;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const claimPath = (claimId: string): string =>
  `/applications/${CLAIM_APPLICATION_REFERENCE}/claims/${claimId}`;

const evidencePath = (evidenceId: string): string =>
  `${claimPath("10")}/evidence/${evidenceId}?disposition=inline`;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Claim errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/test-login");
    await page.waitForURL("/");
  });

  test("redirects to login when claim retrieval returns 401", async ({
    page,
  }) => {
    const response = await page.request.get(claimPath(UNAUTHORISED_CLAIM_ID), {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(HTTP_FOUND);
    expect(response.headers().location).toBe("/auth/login?sessionExpired=true");
  });

  test("shows the forbidden page when claim retrieval returns 403", async ({
    page,
  }) => {
    const response = await page.goto(claimPath(FORBIDDEN_CLAIM_ID));

    expect(response?.status()).toBe(HTTP_FORBIDDEN);
    await expect(page.getByRole("heading", { name: "403" })).toBeVisible();
  });

  test("shows an accessible not-found page when the claim does not exist", async ({
    page,
    checkAccessibility,
  }) => {
    const response = await page.goto(claimPath(MISSING_CLAIM_ID));

    expect(response?.status()).toBe(HTTP_NOT_FOUND);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await checkAccessibility();
  });

  test("shows the generic error page when claim retrieval fails", async ({
    page,
  }) => {
    const response = await page.goto(claimPath(FAILED_CLAIM_ID));

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(
      page.getByText(en.pages.error.internalServerError),
    ).toBeVisible();
  });

  test("does not expose schema details for malformed claim data", async ({
    page,
  }) => {
    const response = await page.goto(claimPath(INVALID_CLAIM_ID));

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(page.getByText(/invalid_type|ZodError/)).toHaveCount(0);
  });

  test("redirects to login when evidence retrieval returns 401", async ({
    page,
  }) => {
    const response = await page.request.get(
      evidencePath(UNAUTHORISED_EVIDENCE_ID),
      {
        maxRedirects: 0,
      },
    );

    expect(response.status()).toBe(HTTP_FOUND);
    expect(response.headers().location).toBe("/auth/login?sessionExpired=true");
  });

  test("shows a not-found page when claim evidence does not exist", async ({
    page,
  }) => {
    const response = await page.goto(evidencePath(MISSING_EVIDENCE_ID));

    expect(response?.status()).toBe(HTTP_NOT_FOUND);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });

  test("shows the generic error page when evidence retrieval fails", async ({
    page,
  }) => {
    const response = await page.goto(evidencePath(FAILED_EVIDENCE_ID));

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
  });

  test("shows the generic error page when Check Your Answers claim retrieval fails", async ({
    page,
  }) => {
    const response = await page.goto(
      `${claimPath(FAILED_CLAIM_ID)}/check-your-answers`,
    );

    expect(response?.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
  });

  test("shows the generic error page when rejecting a claim fails", async ({
    page,
  }) => {
    await page.goto(claimPath(FAILED_REJECTION_CLAIM_ID));
    const form = page.getByTestId("assess-claim");

    await form.getByRole("radio", { name: "Reject" }).check();
    await form
      .getByLabel(en.pages.claimAssessment.reasonLabel)
      .fill("Not enough supporting evidence provided");
    await form.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(
      page.getByText(en.pages.error.internalServerError),
    ).toBeVisible();
  });
});
