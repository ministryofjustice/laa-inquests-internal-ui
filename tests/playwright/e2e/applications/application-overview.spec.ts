import { test, expect } from "../../fixtures/index.js";
import {
  validateGovPage,
  validateHeader,
  validateSummaryCardKeys,
} from "../../utils/govuk-validators.js";

const applicationId = "1";

test.describe("Application overview page", () => {
  test("should have the correct title and back link", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await expect(page).toHaveTitle(/Inquests – GOV.UK/);
    await validateGovPage(page, { headerText: applicationId, backUrl: "/" });

    await checkAccessibility();
  });

  test("should have a status tag", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    const statusTag = page
      .locator("p > .govuk-tag:not(.govuk-phase-banner__content__tag)")
      .first();
    await expect(statusTag).toBeVisible();
  });

  test("should have tabs", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("tab", { name: "Application details" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "People" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Claims" })).toBeVisible();
  });
});

test.describe("Application details tab", () => {
  test("should have the overview content", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "Application details" }).click();

    await validateHeader(page, "Overview", 2);
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

    await checkAccessibility();
  });

  test("should have the proceedings content", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Application details" }).click();

    const applicationDetailsPanel = page.locator("#application-details");
    const inquestCard = applicationDetailsPanel
      .locator(".govuk-summary-card")
      .first();

    await expect(
      applicationDetailsPanel.getByRole("heading", {
        level: 2,
        name: "Proceeding",
        exact: true,
      }),
    ).toBeVisible();
    await expect(inquestCard.getByText("Client role")).toBeVisible();
    await expect(inquestCard.getByText("Level of service")).toBeVisible();
    await expect(inquestCard.getByText("Scope limitation")).toBeVisible();
    await expect(inquestCard.getByText("Cost limit")).toBeVisible();
  });

  test("should have the uploaded evidence content", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "Application details" }).click();

    await validateHeader(page, "Uploaded evidence", 2);
    const applicationDetailsPanel = page.locator("#application-details");
    const evidenceCard = applicationDetailsPanel.locator(
      ".govuk-summary-card",
      { hasText: "Supporting evidence" },
    );
    await expect(
      evidenceCard.locator("dt", { hasText: "Coroners letter" }),
    ).toBeVisible();
    await expect(evidenceCard.getByRole("link")).toHaveText(/.+/);
  });

  test("should have a make assessment button", async ({ page }) => {
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

  test("should open the coroners letter in a new tab", async ({
    page,
    context,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    const evidenceCard = page.locator(".govuk-summary-card", {
      hasText: "Supporting evidence",
    });
    const [newPage, response] = await Promise.all([
      context.waitForEvent("page"),
      context.waitForEvent("response", (response) =>
        response
          .url()
          .includes(`/applications/${applicationId}/coroners-letter`),
      ),
      evidenceCard.getByRole("link").click(),
    ]);

    await newPage.waitForLoadState("domcontentloaded");

    // Verify the URL is correct
    await expect(newPage.url()).toContain(
      `/applications/${applicationId}/coroners-letter`,
    );
  });
});

test.describe("People tab", () => {
  test("should have the client content", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const peoplePanel = page.locator("#people");
    const clientCard = peoplePanel.locator(".govuk-summary-card").filter({
      has: page.locator(".govuk-summary-card__title", { hasText: "Client" }),
    });
    await expect(
      clientCard.locator("dt").getByText("Address", { exact: true }),
    ).toBeVisible();
    await validateSummaryCardKeys(clientCard, [
      "First name",
      "Last name",
      "Date of birth",
      "National Insurance number",
      "Correspondence address",
      "Relationship to deceased",
    ]);

    await checkAccessibility();
  });

  test("should have the deceased content", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const peoplePanel = page.locator("#people");
    const deceasedCard = peoplePanel.locator(".govuk-summary-card").filter({
      has: page.locator(".govuk-summary-card__title", {
        hasText: "Deceased",
      }),
    });
    await validateSummaryCardKeys(deceasedCard, [
      "First name",
      "Last name",
      "Date of death",
      "Date of birth",
      "Inquest ID",
      "Additional inquest info",
    ]);
  });

  test("should have the provider content", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const peoplePanel = page.locator("#people");
    const providerCard = peoplePanel.locator(".govuk-summary-card").filter({
      has: page.locator(".govuk-summary-card__title", {
        hasText: "Provider",
      }),
    });
    await validateSummaryCardKeys(providerCard, [
      "Firm name",
      "Account number",
    ]);
    await expect(
      providerCard.locator("dt").getByText("Address", { exact: true }),
    ).toBeVisible();
  });

  test("should have the interested parties content", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const peoplePanel = page.locator("#people");
    const interestedPartiesCard = peoplePanel
      .locator(".govuk-summary-card")
      .filter({
        has: page.locator(".govuk-summary-card__title", {
          hasText: "Interested parties",
        }),
      });

    await expect(interestedPartiesCard).toBeVisible();
    await expect(interestedPartiesCard.locator("dt").first()).toBeVisible();
  });

  test("should not show Change link for interested parties when application is not granted", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const peoplePanel = page.locator("#people");
    const interestedPartiesCard = peoplePanel
      .locator(".govuk-summary-card")
      .filter({
        has: page.locator(".govuk-summary-card__title", {
          hasText: "Interested parties",
        }),
      });
    const changeLink = interestedPartiesCard.getByRole("link", {
      name: "Change",
    });

    await expect(changeLink).toBeHidden();
  });

  test("should show Change link for interested parties when application is granted", async ({
    page,
  }) => {
    const grantedApplicationId = "5";
    await page.goto(`/applications/${grantedApplicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const peoplePanel = page.locator("#people");
    const interestedPartiesCard = peoplePanel
      .locator(".govuk-summary-card")
      .filter({
        has: page.locator(".govuk-summary-card__title", {
          hasText: "Interested parties",
        }),
      });
    const changeLink = interestedPartiesCard.getByRole("link", {
      name: "Change",
    });

    await expect(changeLink).toBeVisible();
    await expect(changeLink).toHaveAttribute(
      "href",
      `/applications/${grantedApplicationId}/public-authorities`,
    );
  });

  test("should have a make assessment button", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "People" }).click();

    const makeAssessmentButton = page
      .locator("#people")
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

test.describe("History tab", () => {
  test("should have the searching guidance warning text", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "History" }).click();

    const historyPanel = page.locator("#history");
    await expect(historyPanel.locator(".govuk-warning-text")).toContainText(
      "Search this page using Ctrl+F",
    );

    await checkAccessibility();
  });

  test("should prevent double submission of the note form", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "History" }).click();

    const addNoteButton = page
      .locator("#history")
      .getByRole("button", { name: "Add to application history" });
    await expect(addNoteButton).toBeVisible();
    await expect(addNoteButton).toHaveAttribute(
      "data-prevent-double-click",
      "true",
    );
  });

  test("should have a history table with the correct columns", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);

    await page.getByRole("tab", { name: "History" }).click();

    const historyTable = page.locator("#history table");
    await expect(historyTable).toBeVisible();
    await expect(
      historyTable.getByRole("columnheader", { name: "Date and time" }),
    ).toBeVisible();
    await expect(
      historyTable.getByRole("columnheader", { name: "Who" }),
    ).toBeVisible();
    await expect(
      historyTable.getByRole("columnheader", { name: "Update" }),
    ).toBeVisible();
  });
});
