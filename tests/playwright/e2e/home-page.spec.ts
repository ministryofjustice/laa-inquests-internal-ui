import { test, expect } from "../fixtures/index.js";
import { validateMojHeader } from "#tests/playwright/utils/govuk-validators.js";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Inquests – GOV.UK/);
  });

  test("should display correct navigation content", async ({ page }) => {
    await validateMojHeader(page);
  });

  test("should have the correct link for sign out button", async ({ page }) => {
    const signOutLink = page.getByRole("link", { name: "Sign out" });
    await expect(signOutLink).toHaveAttribute("href", "/auth/logout");
  });

  test("navigation items should be in correct order", async ({ page }) => {
    const header = page.getByRole("banner");
    const navigation = header.getByRole("navigation", {
      name: "Account navigation",
    });
    const navLinks = navigation.getByRole("link");

    await expect(navLinks.nth(0)).toHaveText("Test User");
    await expect(navLinks.nth(1)).toHaveText("Sign out");
  });

  test("displays service name and applications table", async ({
    pages,
    checkAccessibility,
  }) => {
    const homePage = pages.homePage;

    await homePage.navigate();
    await homePage.waitForLoad();

    await expect(homePage.heading).toBeVisible();
    const serviceName = await homePage.getServiceName();
    expect(serviceName).toBeTruthy();

    await expect(homePage.developerBanner).toContainText(
      "This page is not production ready and is intended for developers.",
    );

    await expect(homePage.applicationsTable).toBeVisible();
    await expect(homePage.tableCaption).toContainText("All applications");

    const applicationReferences = await homePage.getApplicationReferences();
    expect(applicationReferences.length).toBeGreaterThan(0);

    await checkAccessibility();
  });

  test("table has correct structure", async ({ pages }) => {
    const homePage = pages.homePage;

    await homePage.navigate();
    await homePage.waitForLoad();

    const table = homePage.applicationsTable;
    await expect(table.locator("thead th").nth(0)).toHaveText("Reference");
    await expect(table.locator("thead th").nth(1)).toHaveText("Created Date");
    await expect(table.locator("thead th").nth(2)).toHaveText("Status");
    await expect(table.locator("thead th").nth(3)).toHaveText("Decision");

    const firstReferenceLink = table
      .locator("tbody tr")
      .first()
      .locator("td a");
    await expect(firstReferenceLink).toHaveAttribute(
      "href",
      /\/applications\/\d+\/overview/,
    );

    const firstCreatedDate = table
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(1);
    await expect(firstCreatedDate).toHaveText(
      /\d{1,2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}/,
    );
  });
});
