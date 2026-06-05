import { test, expect } from "../fixtures/index.js";

test("homepage should have the correct title", async ({ page }) => {
  // Navigate to the homepage
  await page.goto("/");

  // Check for the title of the application
  await expect(page).toHaveTitle(/Inquests – GOV.UK/);
});

test("homepage should display MOJ header with LAA branding", async ({ page }) => {
  await page.goto("/");

  // Check for the header with LAA branding
  const header = page.getByRole("banner").first();
  await expect(header).toBeVisible();

  // Check for Legal Aid Agency organization label within the header
  await expect(header.getByRole("link", { name: "Legal Aid Agency" })).toBeVisible();

  // Check for Inquests service label within the header
  await expect(header.getByRole("link", { name: "Inquests" })).toBeVisible();
});

test("homepage should display sign out button in navigation", async ({ page }) => {
  await page.goto("/");

  // Check for the sign out link in the navigation within the header
  const header = page.getByRole("banner");
  const navigation = header.getByRole("navigation", { name: "Account navigation" });
  const signOutLink = navigation.getByRole("link", { name: "Sign out" });
  await expect(signOutLink).toBeVisible();
});

test("homepage navigation should display account name", async ({ page }) => {
  await page.goto("/");

  // Check for the account name in the navigation within the header
  const header = page.getByRole("banner");
  const navigation = header.getByRole("navigation", { name: "Account navigation" });
  const accountNameLink = navigation.getByRole("link", { name: "Account name" });
  await expect(accountNameLink).toBeVisible();
});

test("homepage navigation items should be in correct order", async ({ page }) => {
  await page.goto("/");

  // Get all navigation links within the Account navigation
  const header = page.getByRole("banner");
  const navigation = header.getByRole("navigation", { name: "Account navigation" });
  const navLinks = navigation.getByRole("link");
  
  // Check the order of navigation items
  await expect(navLinks.nth(0)).toHaveText("Account name");
  await expect(navLinks.nth(1)).toHaveText("Sign out");
});

test("home page displays service name and mountains table", async ({
  pages,
  checkAccessibility,
}) => {
  const homePage = pages.homePage;

  // Navigate to home page
  await homePage.navigate();
  await homePage.waitForLoad();

  // Test the service name heading is present
  await expect(homePage.heading).toBeVisible();
  const serviceName = await homePage.getServiceName();
  expect(serviceName).toBeTruthy();

  // Test the mountains table is displayed
  await expect(homePage.mountainsTable).toBeVisible();
  await expect(homePage.tableCaption).toContainText("Mountains of the world");

  // Test specific mountains are in the table
  const mountains = await homePage.getMountainNames();
  expect(mountains).toContain("Everest");
  expect(mountains).toContain("Kilimanjaro");
  expect(mountains).toContain("Aconcagua");
  expect(mountains).toContain("Denali");

  // Test individual mountain row
  const everestRow = homePage.getMountainRow("Everest");
  await expect(everestRow).toBeVisible();
  await expect(everestRow).toContainText("8,850 meters");
  await expect(everestRow).toContainText("Asia");
  await expect(everestRow).toContainText("1953");

  // Run accessibility check
  await checkAccessibility();
});

test("home page table has correct structure", async ({ page, pages }) => {
  const homePage = pages.homePage;

  await homePage.navigate();
  await homePage.waitForLoad();

  // Check table headers
  const table = homePage.mountainsTable;
  await expect(table.locator("thead th").nth(0)).toHaveText("Name");
  await expect(table.locator("thead th").nth(1)).toHaveText("Elevation");
  await expect(table.locator("thead th").nth(2)).toHaveText("Continent");
  await expect(table.locator("thead th").nth(3)).toHaveText("First summit");

  // Check that all expected mountains are present
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
