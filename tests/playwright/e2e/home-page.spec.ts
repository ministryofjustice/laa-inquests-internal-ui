import { test, expect } from "../fixtures/index.js";
import {validateMojHeader} from "#tests/playwright/utils/govuk-validators.js";

test.describe("Home page", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Inquests – GOV.UK/);
  });

  test("should display correct navigation content", async ({ page }) => {
    await expect(validateMojHeader(page)).resolves.not.toThrow();
  })

  test("should have the correct link for sign out button", async ({ page }) => {
    const signOutLink = page.getByRole("link", { name: "Sign out" });
    await expect(signOutLink).toHaveAttribute("href", "/auth/logout");
  })

  test("navigation items should be in correct order", async ({ page }) => {
    const header = page.getByRole("banner");
    const navigation = header.getByRole("navigation", { name: "Account navigation" });
    const navLinks = navigation.getByRole("link");

    await expect(navLinks.nth(0)).toHaveText("Account name");
    await expect(navLinks.nth(1)).toHaveText("Sign out");
  });

  test("displays service name and mountains table", async ({
                                                                       pages,
                                                                       checkAccessibility,
                                                                     }) => {
    const homePage = pages.homePage;

    await homePage.navigate();
    await homePage.waitForLoad();

    await expect(homePage.heading).toBeVisible();
    const serviceName = await homePage.getServiceName();
    expect(serviceName).toBeTruthy();

    await expect(homePage.mountainsTable).toBeVisible();
    await expect(homePage.tableCaption).toContainText("Mountains of the world");

    const mountains = await homePage.getMountainNames();
    expect(mountains).toContain("Everest");
    expect(mountains).toContain("Kilimanjaro");
    expect(mountains).toContain("Aconcagua");
    expect(mountains).toContain("Denali");

    const everestRow = homePage.getMountainRow("Everest");
    await expect(everestRow).toBeVisible();
    await expect(everestRow).toContainText("8,850 meters");
    await expect(everestRow).toContainText("Asia");
    await expect(everestRow).toContainText("1953");

    await checkAccessibility();
  });

  test("table has correct structure", async ({ pages }) => {
    const homePage = pages.homePage;

    await homePage.navigate();
    await homePage.waitForLoad();

    const table = homePage.mountainsTable;
    await expect(table.locator("thead th").nth(0)).toHaveText("Name");
    await expect(table.locator("thead th").nth(1)).toHaveText("Elevation");
    await expect(table.locator("thead th").nth(2)).toHaveText("Continent");
    await expect(table.locator("thead th").nth(3)).toHaveText("First summit");

    const expectedMountains = [
      "Aconcagua",
      "Denali",
      "Elbrus",
      "Everest",
      "Kilimanjaro",
      "Puncak Jaya",
      "Vinson",
    ];

    const actualMountains = await homePage.getMountainNames();
    expect(actualMountains).toHaveLength(expectedMountains.length);

    for (const mountain of expectedMountains) {
      expect(actualMountains).toContain(mountain);
    }
  });
})
