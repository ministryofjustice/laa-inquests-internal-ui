import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const applicationId = "1";
const certificateLocale = en.pages.applicationCertificate;

const applicationOverviewUrl = `/applications/${applicationId}/overview`;
const applicationCertificateUrl = `/applications/${applicationId}/certificate`;

test.describe.only("View certificate page", () => {
  test("back button links back to applications list", async ({ page }) => {
    await page.goto(applicationCertificateUrl);
    await validateGovPage(page, {
      headerText: certificateLocale.title,
      backUrl: applicationOverviewUrl,
    });
  });

  test("should have the correct header", async ({ page }) => {
    await page.goto(applicationCertificateUrl);

    await expect(page.locator("strong", { hasText: "Client:" })).toBeVisible();
    await expect(
      page.locator("strong", { hasText: "LAA Reference number:" }),
    ).toBeVisible();
    await expect(
      page.locator("strong", { hasText: "Date created:" }),
    ).toBeVisible();
  });

  test("should have certificate details table", async ({ page }) => {
    await page.goto(applicationCertificateUrl);

    const overviewHeader = page.getByRole("heading", {
      name: "Overview",
      level: 2,
    });
    await expect(overviewHeader).toBeVisible();

    const certificateDetailsTitle = page.getByText("Certificate details");
    await expect(certificateDetailsTitle).toBeVisible();

    const certificateOverviewTable = page.locator(".govuk-summary-list", {
      hasText: "Client name",
    });

    await expect(
      certificateOverviewTable.getByText("Client name"),
    ).toBeVisible();
    await expect(
      certificateOverviewTable.getByText("Client address"),
    ).toBeVisible();
    await expect(certificateOverviewTable.getByText("Firm name")).toBeVisible();
    await expect(
      certificateOverviewTable.getByText("Office address"),
    ).toBeVisible();
    await expect(
      certificateOverviewTable.getByText("Opponent details"),
    ).toBeVisible();
    await expect(
      certificateOverviewTable.getByText("Guardian name"),
    ).toBeVisible();
    await expect(
      certificateOverviewTable.getByText("Guardian address"),
    ).toBeVisible();
  });

  test("should have certificate summary table", async ({ page }) => {
    await page.goto(applicationCertificateUrl);

    const summaryHeader = page.getByRole("heading", {
      name: "Certificate summary",
      level: 2,
    });
    await expect(summaryHeader).toBeVisible();

    const certificateSummaryTitle = page.getByText("Certificate summary");
    await expect(certificateSummaryTitle).toBeVisible();

    const certificateSummaryTable = page.locator(".govuk-summary-list", {
      hasText: "Certificate type",
    });

    await expect(
      certificateSummaryTable.getByText("Certificate type"),
    ).toBeVisible();
    await expect(certificateSummaryTable.getByText("Status")).toBeVisible();
    await expect(
      certificateSummaryTable.getByText("Effective date", { exact: true }),
    ).toBeVisible();
    await expect(certificateSummaryTable.getByText("End date")).toBeVisible();
    await expect(
      certificateSummaryTable.getByText("Reinstatement date"),
    ).toBeVisible();
    await expect(
      certificateSummaryTable.getByText("Cost limitation", { exact: true }),
    ).toBeVisible();
    await expect(
      certificateSummaryTable.getByText("Cost limitation effective date"),
    ).toBeVisible();
    await expect(
      certificateSummaryTable.getByText("Certificate limitation"),
    ).toBeVisible();
  });
});
