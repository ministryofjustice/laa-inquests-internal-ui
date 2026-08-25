import { BrowserContext, Page } from "playwright";
import { test, expect } from "../../fixtures/index.js";
import { TEST_CONFIG } from "../../playwright.config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };
import {
  continueToNextPage,
  validateGovPage,
  validateCSRFToken,
  validateSubmitButton,
} from "../../utils/govuk-validators.js";

const publicAuthorityLocale = en.pages.applicationOverview.publicAuthority;
const notificationBannerLocale = publicAuthorityLocale.notificationBanner;
const confirmLocale = publicAuthorityLocale.confirm;

const applicationId = "5";
const selectionPage = `/applications/${applicationId}/public-authorities`;
const confirmPage = `/applications/${applicationId}/public-authorities/confirm`;
const overviewPage = `/applications/${applicationId}/overview`;

test.describe.serial("Update public authorities journey", () => {
  let sharedContext: BrowserContext;
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({
      baseURL: TEST_CONFIG.BASE_URL,
    });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({ checkPageAccessibility }) => {
    await checkPageAccessibility(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test("navigates to selection page from overview People tab Change link", async () => {
    await sharedPage.goto(overviewPage);

    await sharedPage.getByRole("tab", { name: "People" }).click();

    const peoplePanel = sharedPage.locator("#people");
    const interestedPartiesCard = peoplePanel
      .locator(".govuk-summary-card")
      .filter({
        has: sharedPage.locator(".govuk-summary-card__title", {
          hasText: "Interested parties",
        }),
      });

    const changeLink = interestedPartiesCard.getByRole("link", {
      name: "Change",
    });
    await expect(changeLink).toBeVisible();
    await changeLink.click();
    await sharedPage.waitForLoadState("domcontentloaded");

    await expect(sharedPage).toHaveURL(selectionPage);
  });

  test("renders the public authority selection page with current selections preselected", async () => {
    await validateGovPage(sharedPage, {
      headerText: publicAuthorityLocale.title,
      backUrl: `/applications/${applicationId}/overview`,
    });

    const form = sharedPage.getByTestId("update-public-authority-form");
    await validateCSRFToken(form);

    // Hint text is visible
    await expect(
      sharedPage.getByText(publicAuthorityLocale.search.hint),
    ).toBeVisible();

    // Current public authority (Department for Transport) should be preselected
    const dftCheckbox = form.getByRole("checkbox", {
      name: "Department for Transport",
    });
    await expect(dftCheckbox).toBeChecked();

    // Other public authorities should be available but not checked
    const cabinetOffice = form.getByRole("checkbox", {
      name: "Cabinet Office",
    });
    await expect(cabinetOffice).toBeVisible();
    await expect(cabinetOffice).not.toBeChecked();
  });

  test("shows validation error when no public authority is selected", async () => {
    const form = sharedPage.getByTestId("update-public-authority-form");

    // Uncheck the preselected checkbox
    const dftCheckbox = form.getByRole("checkbox", {
      name: "Department for Transport",
    });
    await dftCheckbox.uncheck();

    await continueToNextPage(form, sharedPage);

    // Should remain on selection page
    await expect(sharedPage).toHaveURL(selectionPage);

    // Error summary should be visible
    const errorSummary = sharedPage.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link").first()).toHaveAttribute(
      "href",
      "#publicAuthorityOption",
    );
    await expect(
      errorSummary.getByText(publicAuthorityLocale.validationError.notEmpty),
    ).toBeVisible();
  });

  test("selects public authorities and continues to confirmation page", async () => {
    const form = sharedPage.getByTestId("update-public-authority-form");

    // Select multiple public authorities
    await form
      .getByRole("checkbox", { name: "Department for Transport" })
      .check();
    await form.getByRole("checkbox", { name: "Cabinet Office" }).check();
    await form.getByRole("checkbox", { name: "Home Office" }).check();

    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(confirmPage);
  });

  test("renders the confirmation page with selected public authorities", async () => {
    const heading = sharedPage.getByRole("heading", {
      level: 1,
      name: confirmLocale.title,
    });
    await expect(heading).toBeVisible();

    // Summary card should show the selected public authorities
    const summaryCard = sharedPage.locator(".govuk-summary-card");
    const cardTitle = summaryCard.locator(".govuk-summary-card__title");
    await expect(cardTitle).toHaveText(confirmLocale.cardTitle);

    // Verify selected public authorities are listed
    await expect(
      summaryCard.getByText("Department for Transport"),
    ).toBeVisible();
    await expect(summaryCard.getByText("Cabinet Office")).toBeVisible();
    await expect(summaryCard.getByText("Home Office")).toBeVisible();

    // Change link should point back to selection page with ?from=confirm
    const changeLink = summaryCard.getByRole("link", { name: /change/i });
    await expect(changeLink).toHaveAttribute(
      "href",
      `${selectionPage}?from=confirm`,
    );

    // Confirm button should be visible
    await validateSubmitButton(
      sharedPage.getByTestId("confirm-public-authorities"),
      confirmLocale.submitButton,
    );
  });

  test("confirmation page form contains CSRF token", async () => {
    const form = sharedPage.getByTestId("confirm-public-authorities");
    await validateCSRFToken(form);
  });

  // Session preservation — Back from confirm preserves selection
  test("clicking Back from confirm page preserves the in-progress selection", async () => {
    const backLink = sharedPage.getByRole("link", {
      name: "Back",
      exact: true,
    });
    await backLink.click();
    await sharedPage.waitForLoadState("domcontentloaded");

    await expect(sharedPage).toHaveURL(`${selectionPage}?from=confirm`);

    const form = sharedPage.getByTestId("update-public-authority-form");

    // All three previously selected should still be checked
    await expect(
      form.getByRole("checkbox", { name: "Department for Transport" }),
    ).toBeChecked();
    await expect(
      form.getByRole("checkbox", { name: "Cabinet Office" }),
    ).toBeChecked();
    await expect(
      form.getByRole("checkbox", { name: "Home Office" }),
    ).toBeChecked();

    // Unselected ones should still be unchecked
    await expect(
      form.getByRole("checkbox", { name: "Attorney General's Office" }),
    ).not.toBeChecked();
    await expect(
      form.getByRole("checkbox", { name: "Ministry of Defence" }),
    ).not.toBeChecked();
  });

  test("continues back to confirmation page after Back navigation", async () => {
    const form = sharedPage.getByTestId("update-public-authority-form");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(confirmPage);
  });

  test("clicking Change link on confirm page navigates to selection page with session preserved", async () => {
    const summaryCard = sharedPage.locator(".govuk-summary-card");
    const changeLink = summaryCard.getByRole("link", { name: /change/i });
    await changeLink.click();
    await sharedPage.waitForLoadState("domcontentloaded");

    await expect(sharedPage).toHaveURL(`${selectionPage}?from=confirm`);

    const form = sharedPage.getByTestId("update-public-authority-form");

    // Previously selected authorities should still be checked
    await expect(
      form.getByRole("checkbox", { name: "Department for Transport" }),
    ).toBeChecked();
    await expect(
      form.getByRole("checkbox", { name: "Cabinet Office" }),
    ).toBeChecked();
    await expect(
      form.getByRole("checkbox", { name: "Home Office" }),
    ).toBeChecked();
  });

  test("continues to confirmation page after Change link navigation", async () => {
    const form = sharedPage.getByTestId("update-public-authority-form");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(confirmPage);
  });

  test("submitting confirmation redirects to the application overview", async () => {
    const form = sharedPage.getByTestId("confirm-public-authorities");
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(overviewPage);
  });

  test("displays a success notification banner on the overview page after update", async () => {
    const notificationBanner = sharedPage.locator(
      ".govuk-notification-banner--success",
    );
    await expect(notificationBanner).toBeVisible();
    await expect(
      notificationBanner.getByText(notificationBannerLocale.header),
    ).toBeVisible();
    await expect(
      notificationBanner.getByText(notificationBannerLocale.body),
    ).toBeVisible();
  });

  test("notification banner is not shown on subsequent overview page loads", async () => {
    await sharedPage.reload();
    await sharedPage.waitForLoadState("domcontentloaded");

    const notificationBanner = sharedPage.locator(
      ".govuk-notification-banner--success",
    );
    await expect(notificationBanner).not.toBeVisible();
  });

  test("submitting unchanged selection still completes the journey without error", async () => {
    // Navigate fresh to the selection page
    await sharedPage.goto(selectionPage);

    // The current selection from the application is preselected
    const form = sharedPage.getByTestId("update-public-authority-form");

    // Just continue without changing anything
    await continueToNextPage(form, sharedPage);

    await expect(sharedPage).toHaveURL(confirmPage);

    // Confirm
    const confirmForm = sharedPage.getByTestId("confirm-public-authorities");
    await continueToNextPage(confirmForm, sharedPage);

    await expect(sharedPage).toHaveURL(overviewPage);
  });
});

test.describe("Update public authorities — fresh entry resets session", () => {
  test("navigating to selection page via fresh entry resets session from application data", async ({
    page,
    checkAccessibility,
  }) => {
    // Start a journey, select some authorities, go to confirm
    await page.goto(selectionPage);
    const form = page.getByTestId("update-public-authority-form");
    await form.getByRole("checkbox", { name: "Cabinet Office" }).check();
    await continueToNextPage(form, page);
    await expect(page).toHaveURL(confirmPage);

    // Now navigate fresh to the selection page (not via Back — no ?from=confirm)
    await page.goto(selectionPage);

    const freshForm = page.getByTestId("update-public-authority-form");

    // Only the original application public body should be checked (session was reset)
    await expect(
      freshForm.getByRole("checkbox", { name: "Department for Transport" }),
    ).toBeChecked();
    await expect(
      freshForm.getByRole("checkbox", { name: "Cabinet Office" }),
    ).not.toBeChecked();

    await checkAccessibility();
  });
});
