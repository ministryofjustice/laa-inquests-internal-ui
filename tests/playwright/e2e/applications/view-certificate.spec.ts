import { validateGovPage } from "#tests/playwright/utils/govuk-validators.js";
import { test, expect } from "../../fixtures/index.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const applicationId = "1";
const certificateLocale = en.pages.applicationCertificate;

const applicationOverviewUrl = `/applications/${applicationId}/overview`;
const applicationCertificateUrl = `/applications/${applicationId}/certificate`;

test.describe("View certificate page", () => {
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
      certificateOverviewTable.getByText("Office address", { exact: true }),
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

    const certificateSummaryTitle = page.getByText("Certificate summary", {
      exact: true,
    });
    await expect(certificateSummaryTitle).toBeVisible();

    const certificateSummaryTable = page.locator(".govuk-summary-list", {
      hasText: "Certificate type",
    });

    await expect(
      certificateSummaryTable.getByText("Certificate type"),
    ).toBeVisible();
    await expect(
      certificateSummaryTable.getByText("Status", { exact: true }),
    ).toBeVisible();
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

  test("should display correct insert text", async ({ page }) => {
    await page.goto(applicationCertificateUrl);

    const certificateInfoInsertText = page.getByText(
      "This is to certify that the status of the certificate is as specified in the Certificate summary. Its scope is specified in the proceedings listed and is subject to the limitations and conditions.",
    );
    await expect(certificateInfoInsertText).toBeVisible();

    const certificateLimitationsInsertText = page.getByText(
      "This certificate imposes both scope and financially implications on the work to be done under it. Providers should check the limitations imposed carefully and apply for an amendment where appropriate.",
    );
    await expect(certificateLimitationsInsertText).toBeVisible();

    const scopeInsertText = page.getByText(
      "Payment will not be made for work undertaken outside the scope specified or in excess of the cost limit.",
    );
    await expect(scopeInsertText).toBeVisible();
  });

  test("should have scope table", async ({ page }) => {
    await page.goto(applicationCertificateUrl);

    const scopeHeader = page.getByRole("heading", {
      name: "Scope",
      level: 2,
    });
    await expect(scopeHeader).toBeVisible();
    // TODO: change this to check for actual proceeding in the header
    const scopeTableHeading = page.getByText("1. placeholder", { exact: true });
    await expect(scopeTableHeading).toBeVisible();

    const scopeTable = page.locator(".govuk-summary-list", {
      hasText: "Description",
    });

    await expect(scopeTable.getByText("Description")).toBeVisible();
    await expect(scopeTable.getByText("Category of law")).toBeVisible();
    await expect(
      scopeTable.getByText("Current proceeding status"),
    ).toBeVisible();
    await expect(
      scopeTable.getByText(
        "Date work can be commenced on the above proceeding",
      ),
    ).toBeVisible();
    await expect(scopeTable.getByText("Proceeding end date")).toBeVisible();
    await expect(scopeTable.getByText("Client involvement type")).toBeVisible();
    await expect(
      scopeTable.getByText("Level of service", { exact: true }),
    ).toBeVisible();
    await expect(
      scopeTable.getByText("Date current level of service effective"),
    ).toBeVisible();
    await expect(scopeTable.getByText("Limitation")).toBeVisible();
    await expect(scopeTable.getByText("Effective date")).toBeVisible();
    await expect(
      scopeTable.getByText("End date", { exact: true }),
    ).toBeVisible();
  });
});
