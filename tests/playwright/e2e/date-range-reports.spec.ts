import type { Locator, Page, Response } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";
import { validateBackButton } from "../utils/govuk-validators.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
  HTTP_TOO_MANY_REQUESTS,
} from "../constants/httpStatus.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import { PAYMENT_EXTRACT_CSV } from "#tests/playwright/factories/handlers/applications.js";
import { REPORT_CSV } from "#tests/playwright/factories/handlers/reportDownloads.js";
import { FAILED_REPORT_FROM } from "#tests/playwright/factories/handlers/reportErrors.js";

interface DateParts {
  day: string;
  month: string;
  year: string;
}

interface DateRangeReport {
  heading: string;
  path: string;
  description: string;
  maxDays: number;
  startHint: string;
  endHint: string;
  allowedRoles: string[];
  filePrefix: string;
  csv: string;
}

const {
  APPLICATION_WORKFLOW_REPORTING,
  CLAIM_WORKFLOW_REPORTING,
  ASSURANCE,
  FINANCE,
  POLICY,
} = INTERNAL_CASEWORKER_ROLES;

const REPORTS: DateRangeReport[] = [
  {
    heading: "Payments",
    path: "/reports/payments-extract",
    description:
      "View approved claims so that payments can be made to providers.",
    maxDays: 30,
    startHint: "For example, 12 12 2026",
    endHint: "For example, 10 1 2027",
    allowedRoles: [ASSURANCE, FINANCE],
    filePrefix: "payment_extract",
    csv: PAYMENT_EXTRACT_CSV,
  },
  {
    heading: "Claims and applications processing",
    path: "/reports/claims-applications-processing",
    description:
      "View caseworker decisions to monitor activity and volumes, and track against KPIs.",
    maxDays: 30,
    startHint: "For example, 12 12 2026",
    endHint: "For example, 10 1 2027",
    allowedRoles: [APPLICATION_WORKFLOW_REPORTING, CLAIM_WORKFLOW_REPORTING],
    filePrefix: "decisions",
    csv: REPORT_CSV,
  },
  {
    heading: "Costs associated with other government departments",
    path: "/reports/costs-for-other-departments",
    description:
      "Identify which government departments costs should be attributed to for cost sharing, recharges, and budget requests.",
    maxDays: 90,
    startHint: "For example, 1 12 2026",
    endHint: "For example, 1 4 2027",
    allowedRoles: [FINANCE, POLICY],
    filePrefix: "ogd_costs",
    csv: REPORT_CSV,
  },
  {
    heading: "User audit trail",
    path: "/reports/user-audit-trail",
    description:
      "View an audit trail of activity across all cases, including case history events, application views and report downloads.",
    maxDays: 30,
    startHint: "For example, 12 12 2026",
    endHint: "For example, 10 01 2027",
    allowedRoles: [ASSURANCE],
    filePrefix: "audit_trail",
    csv: REPORT_CSV,
  },
];

const START: DateParts = { day: "1", month: "4", year: "2025" };
const NEXT_YEAR = String(new Date().getFullYear() + 1);
const MS_PER_DAY = 86_400_000;

function addDays({ day, month, year }: DateParts, days: number): DateParts {
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) + days * MS_PER_DAY,
  );
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear()),
  };
}

function isoDate({ day, month, year }: DateParts): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function queryFor(start: DateParts, end: DateParts): string {
  return new URLSearchParams({
    "start-date-day": start.day,
    "start-date-month": start.month,
    "start-date-year": start.year,
    "end-date-day": end.day,
    "end-date-month": end.month,
    "end-date-year": end.year,
  }).toString();
}

function reportForm(page: Page, { path }: DateRangeReport): Locator {
  return page.locator(`form[action="${path}/download"]`);
}

function dateGroup(
  page: Page,
  report: DateRangeReport,
  legend: "Start date" | "End date",
): Locator {
  return reportForm(page, report).getByRole("group", { name: legend });
}

async function fillDate(
  page: Page,
  report: DateRangeReport,
  legend: "Start date" | "End date",
  { day, month, year }: DateParts,
): Promise<void> {
  const group = dateGroup(page, report, legend);
  await group.getByLabel("Day").fill(day);
  await group.getByLabel("Month").fill(month);
  await group.getByLabel("Year").fill(year);
}

async function submitReport(
  page: Page,
  report: DateRangeReport,
): Promise<Response> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`${report.path}/download`) &&
      response.request().method() === "GET",
  );
  await reportForm(page, report)
    .getByRole("button", { name: "Download report" })
    .click();
  return await responsePromise;
}

async function expectValidationError(
  page: Page,
  report: DateRangeReport,
  {
    message,
    href,
    legend,
  }: { message: string; href: string; legend: "Start date" | "End date" },
): Promise<void> {
  const errorSummary = page.locator(".govuk-error-summary");
  await expect(errorSummary).toBeVisible();
  await expect(errorSummary).toContainText("There is a problem");
  await expect(
    errorSummary.getByRole("link", { name: message }),
  ).toHaveAttribute("href", href);
  await expect(dateGroup(page, report, legend)).toContainText(message);
}

function displayDate({ day, month, year }: DateParts): string {
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

async function expectHighlightedBoxes(
  page: Page,
  report: DateRangeReport,
  legend: "Start date" | "End date",
  highlighted: { Day: boolean; Month: boolean; Year: boolean },
): Promise<void> {
  const group = dateGroup(page, report, legend);
  for (const [label, isHighlighted] of Object.entries(highlighted)) {
    const box = group.getByLabel(label);
    if (isHighlighted) {
      await expect(box).toHaveClass(/govuk-input--error/);
    } else {
      await expect(box).not.toHaveClass(/govuk-input--error/);
    }
  }
}

const ALL_BOXES = { Day: true, Month: true, Year: true };

async function expectDateValues(
  page: Page,
  report: DateRangeReport,
  legend: "Start date" | "End date",
  { day, month, year }: DateParts,
): Promise<void> {
  const group = dateGroup(page, report, legend);
  await expect(group.getByLabel("Day")).toHaveValue(day);
  await expect(group.getByLabel("Month")).toHaveValue(month);
  await expect(group.getByLabel("Year")).toHaveValue(year);
}

for (const report of REPORTS) {
  const { heading, path, maxDays } = report;
  const lastValidEnd = addDays(START, maxDays - 1);

  test.describe(`Date range report: ${heading}`, () => {
    test("displays the report page from the reusable template", async ({
      page,
      checkAccessibility,
    }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(
        page.getByText(report.description, { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".govuk-inset-text")).toContainText(
        `You must choose a date range of up to ${maxDays} days.`,
      );

      const form = reportForm(page, report);
      await expect(form).toHaveAttribute("method", "get");
      await expect(form).toHaveAttribute("novalidate", "");

      for (const [legend, hint] of [
        ["Start date", report.startHint],
        ["End date", report.endHint],
      ] as const) {
        const group = dateGroup(page, report, legend);
        await expect(group).toBeVisible();
        await expect(group.getByText(hint, { exact: true })).toBeVisible();
        await expect(group.getByLabel("Day")).toBeVisible();
        await expect(group.getByLabel("Month")).toBeVisible();
        await expect(group.getByLabel("Year")).toBeVisible();
      }

      const button = form.getByRole("button", { name: "Download report" });
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute("type", "submit");

      await validateBackButton(page, "/reports");
      await checkAccessibility();
    });

    test("downloads a csv attachment for the longest allowed date range", async ({
      page,
    }) => {
      await page.goto(path);
      await fillDate(page, report, "Start date", START);
      await fillDate(page, report, "End date", lastValidEnd);

      const response = await submitReport(page, report);

      expect(response.status()).toBe(HTTP_OK);
      expect(response.headers()["content-type"]).toContain("text/csv");
      expect(response.headers()["content-disposition"]).toBe(
        `attachment; filename=${report.filePrefix}_${isoDate(START)}_${isoDate(lastValidEnd)}.csv`,
      );
    });

    test("returns the csv provided by the inquests api", async ({ page }) => {
      const response = await page.request.get(
        `${path}/download?${queryFor(START, lastValidEnd)}`,
      );

      expect(response.status()).toBe(HTTP_OK);
      expect(await response.text()).toBe(report.csv);
    });

    test("accepts a single day range", async ({ page }) => {
      await page.goto(path);
      await fillDate(page, report, "Start date", START);
      await fillDate(page, report, "End date", START);

      const response = await submitReport(page, report);

      expect(response.status()).toBe(HTTP_OK);
      expect(response.headers()["content-type"]).toContain("text/csv");
    });

    test.describe("when the inquests api fails", () => {
      const [year, month, day] = FAILED_REPORT_FROM.split("-");
      const failedDate = { day, month, year };

      async function submitFailingReport(page: Page): Promise<Response> {
        await page.goto(path);
        await fillDate(page, report, "Start date", failedDate);
        await fillDate(page, report, "End date", failedDate);
        return await submitReport(page, report);
      }

      test("shows the report failure page with the report name", async ({
        page,
        checkAccessibility,
      }) => {
        const response = await submitFailingReport(page);

        expect(response.status()).toBe(HTTP_INTERNAL_SERVER_ERROR);
        await expect(
          page.getByRole("heading", {
            name: en.pages.error.reportDownloadFailed.heading,
          }),
        ).toBeVisible();
        await expect(
          page.getByText(
            en.pages.error.reportDownloadFailed.bodyDateRange.replace(
              "{reportName}",
              report.heading.toLowerCase(),
            ),
          ),
        ).toBeVisible();
        await expect(
          page.getByText(en.pages.error.reportDownloadFailed.tryAgain),
        ).toBeVisible();
        await checkAccessibility();
      });

      test("does not return a file", async ({ page }) => {
        const response = await submitFailingReport(page);

        expect(response.headers()["content-disposition"]).toBeUndefined();
        expect(response.headers()["content-type"]).toContain("text/html");
      });

      test("links back to the report page with the entered dates", async ({
        page,
      }) => {
        await submitFailingReport(page);

        await page
          .getByRole("link", { name: en.common.back, exact: true })
          .click();

        await expect(page).toHaveURL(
          new RegExp(`${path}\\?${queryFor(failedDate, failedDate)}$`),
        );
        for (const legend of ["Start date", "End date"] as const) {
          const group = dateGroup(page, report, legend);
          await expect(group.getByLabel("Day")).toHaveValue(day);
          await expect(group.getByLabel("Month")).toHaveValue(month);
          await expect(group.getByLabel("Year")).toHaveValue(year);
        }
      });
    });

    test.describe("validation", () => {
      test("shows errors for both dates when nothing is entered", async ({
        page,
        checkAccessibility,
      }) => {
        await page.goto(path);

        const response = await submitReport(page, report);

        expect(response.status()).toBe(HTTP_BAD_REQUEST);
        await expectValidationError(page, report, {
          message: "Enter a start date",
          href: "#start-date-day",
          legend: "Start date",
        });
        await expectValidationError(page, report, {
          message: "Enter an end date",
          href: "#end-date-day",
          legend: "End date",
        });
        await expectHighlightedBoxes(page, report, "Start date", ALL_BOXES);
        await expectHighlightedBoxes(page, report, "End date", ALL_BOXES);
        await validateBackButton(page, "/reports");

        await checkAccessibility();
      });

      test("clears the errors once corrected dates download successfully", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", {
          day: "31",
          month: "2",
          year: "2025",
        });
        await fillDate(page, report, "End date", START);

        const invalidResponse = await submitReport(page, report);
        expect(invalidResponse.status()).toBe(HTTP_BAD_REQUEST);
        await expect(page.locator(".govuk-error-summary")).toBeVisible();

        await fillDate(page, report, "Start date", START);
        const downloadPromise = page.waitForEvent("download");
        await reportForm(page, report)
          .getByRole("button", { name: "Download report" })
          .click();
        await downloadPromise;

        await expect(page.locator(".govuk-error-summary")).toHaveCount(0);
        await expect(
          reportForm(page, report).locator(".govuk-error-message"),
        ).toHaveCount(0);
        await expectHighlightedBoxes(page, report, "Start date", {
          Day: false,
          Month: false,
          Year: false,
        });
        await expectDateValues(page, report, "Start date", START);
      });

      test("keeps the errors when the corrected dates are still invalid", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", {
          day: "31",
          month: "2",
          year: "2025",
        });
        await fillDate(page, report, "End date", START);
        await submitReport(page, report);

        await fillDate(page, report, "Start date", {
          day: "30",
          month: "2",
          year: "2025",
        });
        const response = await submitReport(page, report);

        expect(response.status()).toBe(HTTP_BAD_REQUEST);
        await expectValidationError(page, report, {
          message: "Start date must be a real date",
          href: "#start-date-day",
          legend: "Start date",
        });
      });

      test("shows an error when the start date is not a real date", async ({
        page,
      }) => {
        const invalidStart = { day: "31", month: "2", year: "2025" };
        await page.goto(path);
        await fillDate(page, report, "Start date", invalidStart);
        await fillDate(page, report, "End date", START);

        const response = await submitReport(page, report);

        expect(response.status()).toBe(HTTP_BAD_REQUEST);
        await expectValidationError(page, report, {
          message: "Start date must be a real date",
          href: "#start-date-day",
          legend: "Start date",
        });
        await expectDateValues(page, report, "Start date", invalidStart);
        await expectDateValues(page, report, "End date", START);
      });

      test("shows an error when the start date is not numeric", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", {
          day: "a",
          month: "b",
          year: "c",
        });
        await fillDate(page, report, "End date", START);

        await submitReport(page, report);

        await expectValidationError(page, report, {
          message: "Start date must be a real date",
          href: "#start-date-day",
          legend: "Start date",
        });
      });

      test("shows an error when the start date is in the future", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", {
          day: "1",
          month: "1",
          year: NEXT_YEAR,
        });
        await fillDate(page, report, "End date", START);

        await submitReport(page, report);

        await expectValidationError(page, report, {
          message: "Start date must be today or in the past",
          href: "#start-date-day",
          legend: "Start date",
        });
      });

      test("shows an error when the end date is not a real date", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", START);
        await fillDate(page, report, "End date", {
          day: "31",
          month: "4",
          year: "2025",
        });

        await submitReport(page, report);

        await expectValidationError(page, report, {
          message: "End date must be a real date",
          href: "#end-date-day",
          legend: "End date",
        });
        await expectHighlightedBoxes(page, report, "End date", ALL_BOXES);
        await expectHighlightedBoxes(page, report, "Start date", {
          Day: false,
          Month: false,
          Year: false,
        });
      });

      test("shows an error when the end date year has fewer than four digits", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", START);
        await fillDate(page, report, "End date", {
          day: "30",
          month: "4",
          year: "25",
        });

        await submitReport(page, report);

        await expectValidationError(page, report, {
          message: "End date must be a real date",
          href: "#end-date-day",
          legend: "End date",
        });
      });

      for (const { name, parts, message, href, highlighted } of [
        {
          name: "a month",
          parts: { day: "30", month: "", year: "2025" },
          message: "End date must include a month",
          href: "#end-date-month",
          highlighted: { Day: false, Month: true, Year: false },
        },
        {
          name: "a day",
          parts: { day: "", month: "4", year: "2025" },
          message: "End date must include a day",
          href: "#end-date-day",
          highlighted: { Day: true, Month: false, Year: false },
        },
        {
          name: "a year",
          parts: { day: "30", month: "4", year: "" },
          message: "End date must include a year",
          href: "#end-date-year",
          highlighted: { Day: false, Month: false, Year: true },
        },
        {
          name: "a day and month",
          parts: { day: "", month: "", year: "2025" },
          message: "End date must include a day and month",
          href: "#end-date-day",
          highlighted: { Day: true, Month: true, Year: false },
        },
        {
          name: "a day and year",
          parts: { day: "", month: "4", year: "" },
          message: "End date must include a day and year",
          href: "#end-date-day",
          highlighted: { Day: true, Month: false, Year: true },
        },
        {
          name: "a month and year",
          parts: { day: "30", month: "", year: "" },
          message: "End date must include a month and year",
          href: "#end-date-month",
          highlighted: { Day: false, Month: true, Year: true },
        },
      ]) {
        test(`shows an error naming the missing part when the end date has no ${name}`, async ({
          page,
          checkAccessibility,
        }) => {
          await page.goto(path);
          await fillDate(page, report, "Start date", START);
          await fillDate(page, report, "End date", parts);

          const response = await submitReport(page, report);

          expect(response.status()).toBe(HTTP_BAD_REQUEST);
          await expectValidationError(page, report, {
            message,
            href,
            legend: "End date",
          });
          await expectHighlightedBoxes(page, report, "End date", highlighted);

          await checkAccessibility();
        });
      }

      test("shows an error naming the missing part when the start date has no month", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", {
          day: "1",
          month: "",
          year: "2025",
        });
        await fillDate(page, report, "End date", START);

        await submitReport(page, report);

        await expectValidationError(page, report, {
          message: "Start date must include a month",
          href: "#start-date-month",
          legend: "Start date",
        });
      });

      test("shows an error when the end date is in the future", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", START);
        await fillDate(page, report, "End date", {
          day: "1",
          month: "1",
          year: NEXT_YEAR,
        });

        await submitReport(page, report);

        await expectValidationError(page, report, {
          message: "End date must be today or in the past",
          href: "#end-date-day",
          legend: "End date",
        });
        await expectHighlightedBoxes(page, report, "End date", ALL_BOXES);
      });

      test("shows errors on both dates when the end date is before the start date", async ({
        page,
        checkAccessibility,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", lastValidEnd);
        await fillDate(page, report, "End date", START);

        const response = await submitReport(page, report);

        expect(response.status()).toBe(HTTP_BAD_REQUEST);
        await expectValidationError(page, report, {
          message: `Start date must be the same as or before ${displayDate(START)}`,
          href: "#start-date-day",
          legend: "Start date",
        });
        await expectValidationError(page, report, {
          message: `End date must be the same as or after ${displayDate(lastValidEnd)}`,
          href: "#end-date-day",
          legend: "End date",
        });
        await expectHighlightedBoxes(page, report, "Start date", ALL_BOXES);
        await expectHighlightedBoxes(page, report, "End date", ALL_BOXES);
        await expectDateValues(page, report, "Start date", lastValidEnd);
        await expectDateValues(page, report, "End date", START);

        await checkAccessibility();
      });

      test(`shows an error on both dates when the date range is over ${maxDays} days`, async ({
        page,
        checkAccessibility,
      }) => {
        const tooLongEnd = addDays(START, maxDays);
        await page.goto(path);
        await fillDate(page, report, "Start date", START);
        await fillDate(page, report, "End date", tooLongEnd);

        const response = await submitReport(page, report);

        expect(response.status()).toBe(HTTP_BAD_REQUEST);
        const message = `Date range must be between 1 and ${maxDays} days`;
        await expectValidationError(page, report, {
          message,
          href: "#start-date-day",
          legend: "Start date",
        });
        await expect(dateGroup(page, report, "End date")).toContainText(
          message,
        );
        await expect(
          page.locator(".govuk-error-summary").getByRole("link"),
        ).toHaveCount(1);
        await expectHighlightedBoxes(page, report, "Start date", ALL_BOXES);
        await expectHighlightedBoxes(page, report, "End date", ALL_BOXES);
        await expectDateValues(page, report, "Start date", START);
        await expectDateValues(page, report, "End date", tooLongEnd);
        await validateBackButton(page, "/reports");

        await checkAccessibility();
      });
    });

    test.describe("RBAC behaviour", () => {
      // The session is shared across spec files, so restore full roles for later tests.
      test.afterEach(async ({ page }) => {
        await page.goto("/auth/test-login");
      });

      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES)) {
        const allowed = report.allowedRoles.includes(role);

        test(`${allowed ? "allows" : "forbids"} ${role} to use the report`, async ({
          page,
        }) => {
          await page.goto(
            `/auth/test-login?overrideRoles=${encodeURIComponent(role)}`,
          );

          const pageResponse = await page.request.get(path);
          const downloadResponse = await page.request.get(
            `${path}/download?${queryFor(START, START)}`,
          );

          const expectedStatus = allowed ? HTTP_OK : HTTP_FORBIDDEN;
          expect(pageResponse.status()).toBe(expectedStatus);
          expect(downloadResponse.status()).toBe(expectedStatus);
        });
      }
    });

    test.describe("rate limiting behaviour", () => {
      test.use({
        extraHTTPHeaders: {
          "x-test-enable-report-rate-limit": "true",
        },
      });

      test("downloads only once when attempted multiple times", async ({
        page,
      }) => {
        await page.goto(path);
        await fillDate(page, report, "Start date", START);
        await fillDate(page, report, "End date", lastValidEnd);

        const firstResponse = await submitReport(page, report);
        expect(firstResponse.status()).toBe(HTTP_OK);
        expect(firstResponse.headers()["content-type"]).toContain("text/csv");

        // The button's preventDoubleClick attribute debounces quick double clicks.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const secondResponse = await submitReport(page, report);

        expect(secondResponse.status()).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(secondResponse.headers()["content-type"]).not.toContain(
          "text/csv",
        );
        await expect(
          page.getByText(
            "You must wait 5 seconds before downloading another file.",
          ),
        ).toBeVisible({ timeout: 5000 });
      });
    });
  });
}
