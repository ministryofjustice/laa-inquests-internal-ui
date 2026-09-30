import type { Locator, Page, Response } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";
import { validateBackButton } from "../utils/govuk-validators.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
} from "../constants/httpStatus.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { PAYMENT_EXTRACT_CSV } from "#tests/playwright/factories/handlers/applications.js";
import { FAILED_PAYMENT_EXTRACT_FROM } from "#tests/playwright/factories/handlers/reportErrors.js";

interface DateParts {
  day: string;
  month: string;
  year: string;
}

const PAYMENT_EXTRACT_PATH = "/reports/payment-extract";
const VALID_FROM: DateParts = { day: "1", month: "4", year: "2025" };
const VALID_TO: DateParts = { day: "30", month: "4", year: "2025" };
const NEXT_YEAR = String(new Date().getFullYear() + 1);

function paymentExtractForm(page: Page): Locator {
  return page.locator(`form[action="${PAYMENT_EXTRACT_PATH}"]`);
}

function dateGroup(page: Page, legend: "From" | "To"): Locator {
  return paymentExtractForm(page).getByRole("group", { name: legend });
}

async function fillDate(
  page: Page,
  legend: "From" | "To",
  { day, month, year }: DateParts,
): Promise<void> {
  const group = dateGroup(page, legend);
  await group.getByLabel("Day").fill(day);
  await group.getByLabel("Month").fill(month);
  await group.getByLabel("Year").fill(year);
}

async function submitPaymentExtract(page: Page): Promise<Response> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(PAYMENT_EXTRACT_PATH) &&
      response.request().method() === "GET",
  );
  await paymentExtractForm(page)
    .getByRole("button", { name: "Download CSV" })
    .click();
  return await responsePromise;
}

async function expectValidationError(
  page: Page,
  {
    message,
    href,
    legend,
  }: { message: string; href: string; legend: "From" | "To" },
): Promise<void> {
  const errorSummary = page.locator(".govuk-error-summary");
  await expect(errorSummary).toBeVisible();
  await expect(errorSummary).toContainText("There is a problem");
  await expect(
    errorSummary.getByRole("link", { name: message }),
  ).toHaveAttribute("href", href);
  await expect(dateGroup(page, legend)).toContainText(message);
}

async function expectDateValues(
  page: Page,
  legend: "From" | "To",
  { day, month, year }: DateParts,
): Promise<void> {
  const group = dateGroup(page, legend);
  await expect(group.getByLabel("Day")).toHaveValue(day);
  await expect(group.getByLabel("Month")).toHaveValue(month);
  await expect(group.getByLabel("Year")).toHaveValue(year);
}

test.describe("Payment extract report", () => {
  test("displays the payment extract section with a date range form", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("heading", { level: 2, name: "Payment extract" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Download a CSV of a payment extract within a date range.",
      ),
    ).toBeVisible();

    const form = paymentExtractForm(page);
    await expect(form).toHaveAttribute("method", "get");
    await expect(form).toHaveAttribute("novalidate", "");

    for (const legend of ["From", "To"] as const) {
      const group = dateGroup(page, legend);
      await expect(group).toBeVisible();
      await expect(group.getByLabel("Day")).toBeVisible();
      await expect(group.getByLabel("Month")).toBeVisible();
      await expect(group.getByLabel("Year")).toBeVisible();
    }

    await expect(form.locator('input[name="from-date-day"]')).toBeVisible();
    await expect(form.locator('input[name="to-date-day"]')).toBeVisible();

    const button = form.getByRole("button", { name: "Download CSV" });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("type", "submit");

    await checkAccessibility();
  });

  test("downloads a csv attachment when a valid date range is submitted", async ({
    page,
  }) => {
    await page.goto("/reports");
    await fillDate(page, "From", VALID_FROM);
    await fillDate(page, "To", VALID_TO);

    const response = await submitPaymentExtract(page);

    expect(response.status()).toBe(HTTP_OK);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toBe(
      "attachment; filename=payment_extract_2025-04-01_2025-04-30.csv",
    );
  });

  test("returns the csv provided by the inquests api", async ({ page }) => {
    const query = new URLSearchParams({
      "from-date-day": VALID_FROM.day,
      "from-date-month": VALID_FROM.month,
      "from-date-year": VALID_FROM.year,
      "to-date-day": VALID_TO.day,
      "to-date-month": VALID_TO.month,
      "to-date-year": VALID_TO.year,
    });

    const response = await page.request.get(
      `${PAYMENT_EXTRACT_PATH}?${query.toString()}`,
    );

    expect(response.status()).toBe(HTTP_OK);
    expect(await response.text()).toBe(PAYMENT_EXTRACT_CSV);
  });

  test("shows the generic error page when the inquests api fails", async ({
    page,
  }) => {
    const [year, month, day] = FAILED_PAYMENT_EXTRACT_FROM.split("-");
    await page.goto("/reports");
    await fillDate(page, "From", { day, month, year });
    await fillDate(page, "To", VALID_TO);

    const response = await submitPaymentExtract(page);

    expect(response.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
    await expect(
      page.getByText(en.pages.error.internalServerError),
    ).toBeVisible();
  });

  test("accepts a single day range where the end date equals the start date", async ({
    page,
  }) => {
    await page.goto("/reports");
    await fillDate(page, "From", VALID_FROM);
    await fillDate(page, "To", VALID_FROM);

    const response = await submitPaymentExtract(page);

    expect(response.status()).toBe(HTTP_OK);
    expect(response.headers()["content-type"]).toContain("text/csv");
  });

  test.describe("validation", () => {
    test("shows errors for both dates when nothing is entered", async ({
      page,
      checkAccessibility,
    }) => {
      await page.goto("/reports");

      const response = await submitPaymentExtract(page);

      expect(response.status()).toBe(HTTP_BAD_REQUEST);
      await expectValidationError(page, {
        message: "Enter the start date",
        href: "#from-date-day",
        legend: "From",
      });
      await expectValidationError(page, {
        message: "Enter the end date",
        href: "#to-date-day",
        legend: "To",
      });
      await validateBackButton(page, "/");

      await checkAccessibility();
    });

    test("shows an error when the start date is not a real date", async ({
      page,
    }) => {
      const invalidFrom = { day: "31", month: "2", year: "2025" };
      await page.goto("/reports");
      await fillDate(page, "From", invalidFrom);
      await fillDate(page, "To", VALID_TO);

      const response = await submitPaymentExtract(page);

      expect(response.status()).toBe(HTTP_BAD_REQUEST);
      await expectValidationError(page, {
        message: "Start date must be a real date",
        href: "#from-date-day",
        legend: "From",
      });
      await expectDateValues(page, "From", invalidFrom);
      await expectDateValues(page, "To", VALID_TO);
    });

    test("shows an error when the start date is not numeric", async ({
      page,
    }) => {
      await page.goto("/reports");
      await fillDate(page, "From", { day: "a", month: "b", year: "c" });
      await fillDate(page, "To", VALID_TO);

      await submitPaymentExtract(page);

      await expectValidationError(page, {
        message: "Start date must be a real date",
        href: "#from-date-day",
        legend: "From",
      });
    });

    test("shows an error when the start date is in the future", async ({
      page,
    }) => {
      await page.goto("/reports");
      await fillDate(page, "From", { day: "1", month: "1", year: NEXT_YEAR });
      await fillDate(page, "To", VALID_TO);

      await submitPaymentExtract(page);

      await expectValidationError(page, {
        message: "Start date must be today or in the past",
        href: "#from-date-day",
        legend: "From",
      });
    });

    test("shows an error when the end date is not a real date", async ({
      page,
    }) => {
      await page.goto("/reports");
      await fillDate(page, "From", VALID_FROM);
      await fillDate(page, "To", { day: "31", month: "4", year: "2025" });

      await submitPaymentExtract(page);

      await expectValidationError(page, {
        message: "End date must be a real date",
        href: "#to-date-day",
        legend: "To",
      });
    });

    test("shows an error when the end date is in the future", async ({
      page,
    }) => {
      await page.goto("/reports");
      await fillDate(page, "From", VALID_FROM);
      await fillDate(page, "To", { day: "1", month: "1", year: NEXT_YEAR });

      await submitPaymentExtract(page);

      await expectValidationError(page, {
        message: "End date must be today or in the past",
        href: "#to-date-day",
        legend: "To",
      });
    });

    test("shows an error when the end date is before the start date", async ({
      page,
      checkAccessibility,
    }) => {
      await page.goto("/reports");
      await fillDate(page, "From", VALID_TO);
      await fillDate(page, "To", VALID_FROM);

      const response = await submitPaymentExtract(page);

      expect(response.status()).toBe(HTTP_BAD_REQUEST);
      await expectValidationError(page, {
        message: "End date must be the same as or after the start date",
        href: "#to-date-day",
        legend: "To",
      });
      await expectDateValues(page, "From", VALID_TO);
      await expectDateValues(page, "To", VALID_FROM);

      await checkAccessibility();
    });

    test("shows an error summary when the inquests api rejects a date range over 90 days", async ({
      page,
      checkAccessibility,
    }) => {
      const longRangeFrom = { day: "1", month: "1", year: "2024" };
      await page.goto("/reports");
      await fillDate(page, "From", longRangeFrom);
      await fillDate(page, "To", VALID_TO);

      const response = await submitPaymentExtract(page);

      expect(response.status()).toBe(HTTP_BAD_REQUEST);
      await expectValidationError(page, {
        message: "Date range must be 90 days or less",
        href: "#to-date-day",
        legend: "To",
      });
      await expectDateValues(page, "From", longRangeFrom);
      await expectDateValues(page, "To", VALID_TO);
      await validateBackButton(page, "/");

      await checkAccessibility();
    });
  });

  test.describe("RBAC behaviour", () => {
    const allowedRoles: string[] = [INTERNAL_CASEWORKER_ROLES.FINANCE];

    // The session is shared across spec files, so restore full roles for later tests.
    test.afterEach(async ({ page }) => {
      await page.goto("/auth/test-login");
    });

    test("displays the payment extract section only to permitted roles", async ({
      page,
    }) => {
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/reports");
        await expect(
          page.getByRole("heading", { level: 2, name: "Payment extract" }),
        ).toBeVisible();
      }
    });

    test("does not display the payment extract section to unauthorised roles", async ({
      page,
    }) => {
      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES)) {
        if (!allowedRoles.includes(role)) {
          await page.goto(`/auth/test-login?overrideRoles=${role}`);
          await page.goto("/reports");
          await expect(
            page.getByRole("heading", { level: 2, name: "Payment extract" }),
          ).not.toBeVisible();
        }
      }
    });

    test("forbids unauthorised roles from downloading the payment extract", async ({
      page,
    }) => {
      const query =
        "from-date-day=1&from-date-month=4&from-date-year=2025" +
        "&to-date-day=30&to-date-month=4&to-date-year=2025";
      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES)) {
        if (!allowedRoles.includes(role)) {
          await page.goto(`/auth/test-login?overrideRoles=${role}`);
          const response = await page.request.get(
            `${PAYMENT_EXTRACT_PATH}?${query}`,
          );
          expect(response.status()).toBe(HTTP_FORBIDDEN);
        }
      }
    });
  });
});
