import { test, expect } from "../../fixtures/index.js";

test.describe("Application overview page", () => {
  const applicationId = "1";

  test("application overview page should have the correct title and back link", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    const backButton = page.getByRole("link", { name: "Back", exact: true });
    const applicationHeading = await page.getByRole("heading", {
      level: 1,
      name: applicationId,
    });

    await expect(page).toHaveTitle(/Inquests – GOV.UK/);
    await expect(applicationHeading).toBeVisible();
    await expect(backButton).toBeVisible();
    await expect(backButton).toHaveAttribute("href", "#");
  });

  test("application overview page has status tag", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    const statusTag = page.locator("p > .govuk-tag:not(.govuk-phase-banner__content__tag)").first();
    await expect(statusTag).toBeVisible();
  });

  test("application overview page should have tabs", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("tab", { name: "Application details" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "People" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History" })).toBeVisible();
  });

  test("application details tab should have the overview content", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "Application details" }).click();

    await expect(
      page.getByRole("heading", { level: 2, name: "Overview" }),
    ).toBeVisible();
    const applicationDetailsPanel = page.locator("#application-details");
    const overviewSummaryList = applicationDetailsPanel.locator(
      ".govuk-summary-list",
      { hasText: "Application type" },
    );
    await expect(
      overviewSummaryList.getByText("Application type"),
    ).toBeVisible();
    await expect(
      overviewSummaryList.getByText("Certificate type"),
    ).toBeVisible();
    await expect(
      overviewSummaryList.getByText("Merits application"),
    ).toBeVisible();
  });

  test("application details tab should have the proceedings content", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "Application details" }).click();

    await expect(
      page.getByRole("heading", { level: 2, name: "Proceedings" }),
    ).toBeVisible();
    const applicationDetailsPanel = page.locator("#application-details");
    const inquestCard = applicationDetailsPanel.locator(".govuk-summary-card").first();
    await expect(inquestCard.getByText("Client role")).toBeVisible();
    await expect(inquestCard.getByText("Level of service")).toBeVisible();
    await expect(inquestCard.getByText("Scope limitation")).toBeVisible();
    await expect(inquestCard.getByText("Cost limit")).toBeVisible();
  });

  test("application details tab should have the uploaded evidence content", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "Application details" }).click();

    await expect(
      page.getByRole("heading", { level: 2, name: "Uploaded evidence" }),
    ).toBeVisible();
    const applicationDetailsPanel = page.locator("#application-details");
    const evidenceCard = applicationDetailsPanel.locator(
      ".govuk-summary-card",
      { hasText: "Supporting evidence" },
    );
    await expect(
      evidenceCard.locator("dt", { hasText: "Coroners letter" }),
    ).toBeVisible();
    await expect(
      evidenceCard.getByRole("link", {
        name: "Inquest ABC Coroners letter.pdf",
      }),
    ).toBeVisible();
  });

  test("application details tab should have a make assessment button", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "Application details" }).click();

    const makeAssessmentButton = page
      .locator("#application-details")
      .getByRole("button", { name: "Make assessment" });
    await expect(makeAssessmentButton).toBeVisible();
    await expect(makeAssessmentButton).toHaveAttribute(
      "href",
      `/applications/${applicationId}/decision`,
    );
    await makeAssessmentButton.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.url()).toContain(
      `/applications/${applicationId}/decision`,
    );
  });
});
