import { test, expect } from "../fixtures/index.js";
import { validateBackButton } from "../utils/govuk-validators.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

test.describe("Reports page", () => {
  test("displays reports heading and backlog download links", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto("/reports");

    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(
      page.getByText(
        "This page is not production ready and is intended for developers.",
      ),
    ).toBeVisible();

    const applicationsBacklogLink = page.getByRole("link", {
      name: "Download Applications Backlog",
    });
    const claimsBacklogLink = page.getByRole("link", {
      name: "Download Claims Backlog",
    });

    await validateBackButton(page, "/");

    await expect(applicationsBacklogLink).toBeVisible();
    await expect(applicationsBacklogLink).toHaveAttribute(
      "href",
      "/reports/applications/backlog",
    );
    await expect(claimsBacklogLink).toBeVisible();
    await expect(claimsBacklogLink).toHaveAttribute(
      "href",
      "/reports/claims/backlog",
    );

    await checkAccessibility();
  });

  test("download link returns csv attachment response", async ({ page }) => {
    await page.goto("/reports");

    const backlogResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/reports/applications/backlog") &&
        response.request().method() === "GET",
    );

    await page
      .getByRole("link", { name: "Download Applications Backlog" })
      .click();

    const backlogResponse = await backlogResponsePromise;

    expect(backlogResponse.status()).toBe(200);
    expect(backlogResponse.headers()["content-type"]).toContain("text/csv");
    expect(backlogResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });

  test("claims download link returns csv attachment response", async ({
    page,
  }) => {
    await page.goto("/reports");

    const claimsBacklogResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/reports/claims/backlog") &&
        response.request().method() === "GET",
    );

    await page.getByRole("link", { name: "Download Claims Backlog" }).click();

    const claimsBacklogResponse = await claimsBacklogResponsePromise;

    expect(claimsBacklogResponse.status()).toBe(200);
    expect(claimsBacklogResponse.headers()["content-type"]).toContain(
      "text/csv",
    );
    expect(claimsBacklogResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });

  test.describe("RBAC behaviour", () => {
    test.afterEach(async ({ page }) => await page.goto("/auth/test-login"));
    test("displays applications backlog download link only to permitted roles", async ({
      page,
    }) => {
      const allowedRoles = [
        INTERNAL_CASEWORKER_ROLES.APPLICATION_WORKFLOW_REPORTING,
      ];
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto(`/reports`);
        await expect(
          page.getByRole("link", { name: "Download Applications Backlog" }),
        ).toBeVisible();
      }
    });

    test("displays claims backlog download link only to permitted roles", async ({
      page,
    }) => {
      const allowedRoles = [INTERNAL_CASEWORKER_ROLES.CLAIM_WORKFLOW_REPORTING];
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto(`/reports`);
        await expect(
          page.getByRole("link", { name: "Download Claims Backlog" }),
        ).toBeVisible();
      }
    });

    test("does not display applications backlog download link to unauthorised roles", async ({
      page,
    }) => {
      const allowedRoles = [
        INTERNAL_CASEWORKER_ROLES.APPLICATION_WORKFLOW_REPORTING,
      ];
      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES)) {
        if (!allowedRoles.includes(role)) {
          await page.goto(`/auth/test-login?overrideRoles=${role}`);
          await page.goto(`/reports`);
          await expect(
            page.getByRole("link", { name: "Download Applications Backlog" }),
          ).not.toBeVisible();
        }
      }
    });

    test("does not display claims backlog download link to unauthorised roles", async ({
      page,
    }) => {
      const allowedRoles = [INTERNAL_CASEWORKER_ROLES.CLAIM_WORKFLOW_REPORTING];
      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES)) {
        if (!allowedRoles.includes(role)) {
          await page.goto(`/auth/test-login?overrideRoles=${role}`);
          await page.goto(`/reports`);
          await expect(
            page.getByRole("link", { name: "Download Claims Backlog" }),
          ).not.toBeVisible();
        }
      }
    });
  });

  test.describe("Rate limiting behaviour", () => {
    test.use({
      extraHTTPHeaders: {
        "x-test-enable-report-rate-limit": "true",
      },
    });
    test("downloads applications backlog only once when attempted multiple times", async ({
      page,
    }) => {
      await page.goto("/reports");
      const backlogResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/reports/applications/backlog") &&
          response.request().method() === "GET",
      );

      await page
        .getByRole("link", { name: "Download Applications Backlog" })
        .click();

      const backlogResponse = await backlogResponsePromise;

      expect(backlogResponse.status()).toBe(200);
      expect(backlogResponse.headers()["content-type"]).toContain("text/csv");
      expect(backlogResponse.headers()["content-disposition"]).toContain(
        "attachment",
      );

      // Attempt to download the applications backlog a second time
      const secondBacklogResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/reports/applications/backlog") &&
          response.request().method() === "GET",
      );

      await page
        .getByRole("link", { name: "Download Applications Backlog" })
        .click();

      const secondBacklogResponse = await secondBacklogResponsePromise;

      expect(secondBacklogResponse.status()).toBe(429);
      expect(secondBacklogResponse.headers()["content-type"]).not.toContain(
        "text/csv",
      );

      await expect(
        page.getByText("Please do not attempt to download reports too quickly"),
      ).toBeVisible({ timeout: 5000 });
    });

    test("downloads claims backlog only once when attempted multiple times", async ({
      page,
    }) => {
      await page.goto("/reports");
      const backlogResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/reports/claims/backlog") &&
          response.request().method() === "GET",
      );

      await page.getByRole("link", { name: "Download Claims Backlog" }).click();

      const backlogResponse = await backlogResponsePromise;

      expect(backlogResponse.status()).toBe(200);
      expect(backlogResponse.headers()["content-type"]).toContain("text/csv");
      expect(backlogResponse.headers()["content-disposition"]).toContain(
        "attachment",
      );

      // Attempt to download the claims backlog a second time
      const secondBacklogResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/reports/claims/backlog") &&
          response.request().method() === "GET",
      );

      await page.getByRole("link", { name: "Download Claims Backlog" }).click();

      const secondBacklogResponse = await secondBacklogResponsePromise;

      expect(secondBacklogResponse.status()).toBe(429);
      expect(secondBacklogResponse.headers()["content-type"]).not.toContain(
        "text/csv",
      );

      await expect(
        page.getByText("Please do not attempt to download reports too quickly"),
      ).toBeVisible({ timeout: 5000 });
    });

    test("downloads payment extract only once when attempted multiple times", async ({
      page,
    }) => {
      await page.goto("/reports");
      const paymentExtractResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/reports/payment-extract") &&
          response.request().method() === "GET",
      );

      await page.locator("[name='from-date-day']").fill("1");
      await page.locator("[name='from-date-month']").fill("9");
      await page.locator("[name='from-date-year']").fill("2026");
      await page.locator("[name='to-date-day']").fill("1");
      await page.locator("[name='to-date-month']").fill("10");
      await page.locator("[name='to-date-year']").fill("2026");

      await page.getByRole("button", { name: "Download CSV" }).click();

      const paymentExtractResponse = await paymentExtractResponsePromise;

      expect(paymentExtractResponse.status()).toBe(200);
      expect(paymentExtractResponse.headers()["content-type"]).toContain(
        "text/csv",
      );
      expect(paymentExtractResponse.headers()["content-disposition"]).toContain(
        "attachment",
      );

      // Attempt to download the payment extract a second time
      const secondPaymentExtractResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/reports/payment-extract") &&
          response.request().method() === "GET",
      );
      // Wait for 1 second because the button's preventDoubleClick attribute debounces quick double clicks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.getByRole("button", { name: "Download CSV" }).click();

      const secondPaymentExtractResponse =
        await secondPaymentExtractResponsePromise;

      expect(secondPaymentExtractResponse.status()).toBe(400);
      expect(
        secondPaymentExtractResponse.headers()["content-type"],
      ).not.toContain("text/csv");

      await expect(
        page.getByText("Please do not attempt to download reports too quickly"),
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
