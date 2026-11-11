import type { Locator, Page, Response } from "@playwright/test";
import { test, expect } from "../fixtures/index.js";
import { validateBackButton } from "../utils/govuk-validators.js";
import {
  HTTP_FORBIDDEN,
  HTTP_OK,
  HTTP_TOO_MANY_REQUESTS,
} from "../constants/httpStatus.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

const FILE_SIZE_ESTIMATE = "(CSV, estimated 15KB)";
const {
  APPLICATION_WORKFLOW_REPORTING,
  CLAIM_WORKFLOW_REPORTING,
  ASSURANCE,
  FINANCE,
  POLICY,
} = INTERNAL_CASEWORKER_ROLES;

interface ReportLink {
  section: string;
  name: string;
  href: string;
  description: string;
  allowedRoles: string[];
  downloadsDirectly: boolean;
}

const OPERATIONS = "Operations reports";
const FINANCE_SECTION = "Finance reports";
const MANAGEMENT_INFORMATION = "Management information reports";

// Listed in the order they appear on the page.
const REPORT_LINKS: ReportLink[] = [
  {
    section: OPERATIONS,
    name: `Download claims workflow backlog ${FILE_SIZE_ESTIMATE}`,
    href: "/reports/claims/backlog",
    description: "Claims awaiting assessment",
    allowedRoles: [CLAIM_WORKFLOW_REPORTING],
    downloadsDirectly: true,
  },
  {
    section: OPERATIONS,
    name: `Download applications workflow backlog ${FILE_SIZE_ESTIMATE}`,
    href: "/reports/applications/backlog",
    description: "Applications awaiting assessment",
    allowedRoles: [APPLICATION_WORKFLOW_REPORTING],
    downloadsDirectly: true,
  },
  {
    section: FINANCE_SECTION,
    name: "Payments extract",
    href: "/reports/payments-extract",
    description: "Filter claims that are approved for payment by date",
    allowedRoles: [ASSURANCE, FINANCE],
    downloadsDirectly: false,
  },
  {
    section: MANAGEMENT_INFORMATION,
    name: `Cost estimation and forecasting ${FILE_SIZE_ESTIMATE}`,
    href: "/reports/cost-estimation-and-forecasting",
    description: "Live certificates with an outstanding cost limit",
    allowedRoles: [FINANCE, POLICY],
    downloadsDirectly: true,
  },
  {
    section: MANAGEMENT_INFORMATION,
    name: "Claims and applications processing",
    href: "/reports/claims-applications-processing",
    description: "Filter application and claims decisions by date",
    allowedRoles: [APPLICATION_WORKFLOW_REPORTING, CLAIM_WORKFLOW_REPORTING],
    downloadsDirectly: false,
  },
  {
    section: MANAGEMENT_INFORMATION,
    name: "Costs associated with other government departments",
    href: "/reports/costs-for-other-departments",
    description: "Filter claims and the associated interested parties by date",
    allowedRoles: [FINANCE, POLICY],
    downloadsDirectly: false,
  },
  {
    section: MANAGEMENT_INFORMATION,
    name: "User audit trail",
    href: "/reports/user-audit-trail",
    description: "Filter user activity against cases by date",
    allowedRoles: [ASSURANCE],
    downloadsDirectly: false,
  },
];

const DIRECT_DOWNLOADS = REPORT_LINKS.filter(
  ({ downloadsDirectly }) => downloadsDirectly,
);

const ROLES_WITH_REPORT_ACCESS = [
  ...new Set(REPORT_LINKS.flatMap(({ allowedRoles }) => allowedRoles)),
];

function reportLink(page: Page, { name }: ReportLink): Locator {
  return page.getByRole("link", { name, exact: true });
}

async function loginAs(page: Page, ...roles: string[]): Promise<void> {
  await page.goto(
    `/auth/test-login?overrideRoles=${encodeURIComponent(roles.join(","))}`,
  );
}

test.describe("Download reports page", () => {
  test("displays the heading and section headings", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("heading", { level: 1, name: "Download reports" }),
    ).toBeVisible();
    for (const section of [
      OPERATIONS,
      FINANCE_SECTION,
      MANAGEMENT_INFORMATION,
    ]) {
      await expect(
        page.getByRole("heading", { level: 2, name: section }),
      ).toBeVisible();
    }
    await validateBackButton(page, "/");

    await checkAccessibility();
  });

  test("lists every report link with its href and description", async ({
    page,
  }) => {
    await page.goto("/reports");

    for (const link of REPORT_LINKS) {
      await expect(reportLink(page, link)).toBeVisible();
      await expect(reportLink(page, link)).toHaveAttribute("href", link.href);
      await expect(
        page.getByText(link.description, { exact: true }),
      ).toBeVisible();
    }
  });

  test("groups the report links under their section headings in the order of the design", async ({
    page,
  }) => {
    await page.goto("/reports");

    const expected: string[] = [];
    for (const section of [
      OPERATIONS,
      FINANCE_SECTION,
      MANAGEMENT_INFORMATION,
    ]) {
      expected.push(
        section,
        ...REPORT_LINKS.filter((link) => link.section === section).map(
          ({ href }) => href,
        ),
      );
    }

    const actual = await page
      .locator('main h2, main a[href^="/reports/"]')
      .evaluateAll((elements) =>
        elements.map((element) =>
          element.tagName === "A"
            ? element.getAttribute("href")
            : element.textContent.trim(),
        ),
      );

    expect(actual).toEqual(expected);
  });

  test.describe("direct downloads", () => {
    for (const link of DIRECT_DOWNLOADS) {
      test(`${link.href} returns a csv attachment`, async ({ page }) => {
        await page.goto("/reports");

        const responsePromise = page.waitForResponse(
          (response) =>
            response.url().endsWith(link.href) &&
            response.request().method() === "GET",
        );
        await reportLink(page, link).click();
        const response = await responsePromise;

        expect(response.status()).toBe(HTTP_OK);
        expect(response.headers()["content-type"]).toContain("text/csv");
        expect(response.headers()["content-disposition"]).toContain(
          "attachment",
        );
      });
    }
  });

  test.describe("RBAC behaviour", () => {
    // The session is shared across spec files, so restore full roles for later tests.
    test.afterEach(async ({ page }) => {
      await page.goto("/auth/test-login");
    });

    for (const role of ROLES_WITH_REPORT_ACCESS) {
      test(`only shows the reports ${role} may use`, async ({ page }) => {
        await loginAs(page, role);
        await page.goto("/reports");

        for (const link of REPORT_LINKS) {
          const visibility = link.allowedRoles.includes(role)
            ? expect(reportLink(page, link)).toBeVisible()
            : expect(reportLink(page, link)).not.toBeVisible();
          await visibility;
        }
      });

      test(`only allows ${role} to open the reports it may use`, async ({
        page,
      }) => {
        await loginAs(page, role);

        for (const link of REPORT_LINKS) {
          const response = await page.request.get(link.href);
          expect(response.status(), `${role} -> ${link.href}`).toBe(
            link.allowedRoles.includes(role) ? HTTP_OK : HTTP_FORBIDDEN,
          );
        }
      });
    }

    test("shows a section heading only when the role can see a report in it", async ({
      page,
    }) => {
      await loginAs(page, POLICY);
      await page.goto("/reports");

      await expect(
        page.getByRole("heading", { level: 2, name: MANAGEMENT_INFORMATION }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: OPERATIONS }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: FINANCE_SECTION }),
      ).not.toBeVisible();
    });

    test("combines the reports of several roles", async ({ page }) => {
      await loginAs(page, APPLICATION_WORKFLOW_REPORTING, POLICY);
      await page.goto("/reports");

      const expectedVisible = REPORT_LINKS.filter(
        ({ allowedRoles }) =>
          allowedRoles.includes(APPLICATION_WORKFLOW_REPORTING) ||
          allowedRoles.includes(POLICY),
      );
      for (const link of REPORT_LINKS) {
        if (expectedVisible.includes(link)) {
          await expect(reportLink(page, link)).toBeVisible();
        } else {
          await expect(reportLink(page, link)).not.toBeVisible();
        }
      }
    });
  });

  test.describe("rate limiting behaviour", () => {
    test.use({
      extraHTTPHeaders: {
        "x-test-enable-report-rate-limit": "true",
      },
    });

    for (const link of DIRECT_DOWNLOADS) {
      test(`downloads ${link.href} only once when attempted multiple times`, async ({
        page,
      }) => {
        await page.goto("/reports");
        const isDownload = (response: Response): boolean =>
          response.url().endsWith(link.href) &&
          response.request().method() === "GET";

        const firstResponsePromise = page.waitForResponse(isDownload);
        await reportLink(page, link).click();
        const firstResponse = await firstResponsePromise;
        expect(firstResponse.status()).toBe(HTTP_OK);
        expect(firstResponse.headers()["content-type"]).toContain("text/csv");

        const secondResponsePromise = page.waitForResponse(isDownload);
        await reportLink(page, link).click();
        const secondResponse = await secondResponsePromise;

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
    }
  });
});
