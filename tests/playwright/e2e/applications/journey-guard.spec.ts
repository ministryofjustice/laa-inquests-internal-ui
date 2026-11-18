import { test, expect } from "#tests/playwright/fixtures/index.js";

test.describe("Application decision journey guard", () => {
  test("should redirect to the first step if journey not started", async ({
    page,
  }) => {
    await page.goto("/applications/INQ-YYY-YYY/overview");
    await page.goto("/applications/INQ-YYY-YYY/decision/success");
    await expect(page).toHaveURL("/applications/INQ-YYY-YYY/decision");
  });

  test("should redirect to the last completed step when attempting to skip ahead", async ({
    page,
  }) => {
    await page.goto("/applications/INQ-YYY-YYY/decision/justification");
    await page.goto("/applications/INQ-YYY-YYY/decision/success");
    await expect(page).toHaveURL(
      "/applications/INQ-YYY-YYY/decision/justification",
    );
  });
});

test.describe("Claim decision journey guard", () => {
  test("should redirect to the first step if journey not started", async ({
    page,
  }) => {
    await page.goto("/applications/INQ-YYY-YYY/overview");
    await page.goto(
      "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/paid-in-full",
    );
    await expect(page).toHaveURL(
      "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY",
    );
  });

  test("should redirect to the last completed step when attempting to skip ahead", async ({
    page,
  }) => {
    await page.goto(
      "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
    );
    await page.goto(
      "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/check-your-answers",
    );
    await expect(page).toHaveURL(
      "/applications/INQ-YYY-YYY/claims/INQC-YYYY-YYYY/confirm-profit-costs",
    );
  });
});

test.describe("Public authority journey guard", () => {
  test("should redirect to the first step if journey not started", async ({
    page,
  }) => {
    await page.goto("/applications/INQ-YYY-YYY/overview");
    await page.goto("/applications/INQ-YYY-YYY/public-authorities/confirm");
    await expect(page).toHaveURL(
      "/applications/INQ-YYY-YYY/public-authorities",
    );
  });
});
