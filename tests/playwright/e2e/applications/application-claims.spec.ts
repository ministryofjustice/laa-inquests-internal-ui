import { test, expect } from "../../fixtures/index.js";
import { validateHeader } from "../../utils/govuk-validators.js";

test.describe("Claims tab", () => {
  test("should show the Claims tab", async ({ page }) => {
    await page.goto(`/applications/5/overview`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("tab", { name: "Claims" })).toBeVisible();
  });
});

test.describe("Claims tab - with claims", () => {
  const applicationId = "5";

  test("should show the total section", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");

    await validateHeader(page, "Total", 2);
    await expect(
      claimsPanel.locator("p", { hasText: "Substantive certificate:" }),
    ).toContainText("£10,000");
    await expect(
      claimsPanel.locator("p", { hasText: "Total remaining:" }),
    ).toContainText("£8,000");
  });

  test("should show the claims to be assessed table", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Claims to be assessed",
      }),
    ).toBeVisible();

    const table = claimsPanel.locator("table", {
      has: page.locator(`a[href="/applications/${applicationId}/claims/10"]`),
    });

    const headers = table.locator("thead th");
    await expect(headers.nth(0)).toHaveText("Date");
    await expect(headers.nth(1)).toHaveText("Total amount");
    await expect(headers.nth(2)).toHaveText("Status");
    await expect(headers.nth(3)).toHaveText("Type of claim");
    await expect(headers.nth(4)).toHaveText("View");

    const row = table.locator("tbody tr", {
      has: page.locator(`a[href="/applications/${applicationId}/claims/10"]`),
    });
    await expect(row).toContainText("10 August 2026");
    await expect(row).toContainText("£1,200");
    await expect(row).toContainText("Submitted");
    await expect(row).toContainText("Payment on account");
    await expect(
      row.getByRole("link", { name: "See details" }),
    ).toHaveAttribute("href", `/applications/${applicationId}/claims/10`);
  });

  test("should show the assessed claims table", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Assessed claims",
      }),
    ).toBeVisible();

    const table = claimsPanel.locator("table", {
      has: page.locator(`a[href="/applications/${applicationId}/claims/20"]`),
    });

    const headers = table.locator("thead th");
    await expect(headers.nth(0)).toHaveText("Date");
    await expect(headers.nth(1)).toHaveText("Total amount");
    await expect(headers.nth(2)).toHaveText("Status");
    await expect(headers.nth(3)).toHaveText("Type of claim");
    await expect(headers.nth(4)).toHaveText("View");

    const row = table.locator("tbody tr").first();
    await expect(row).toContainText("01 July 2026");
    await expect(row).toContainText("£2,000");
    await expect(row).toContainText("Pay in full");
    await expect(row).toContainText("Payment on account");
    await expect(
      row.getByRole("link", { name: "See details" }),
    ).toHaveAttribute("href", `/applications/${applicationId}/claims/20`);
  });
});

test.describe("Claims tab - empty state", () => {
  const applicationId = "7";

  test("should show the no claims message and no tables", async ({ page }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(claimsPanel).toContainText(
      "There are no claims associated with this application yet.",
    );
    await expect(claimsPanel.locator("table")).toHaveCount(0);
  });
});

test.describe("Claims tab - only claims to be assessed", () => {
  const applicationId = "6";

  test("should show the to be assessed table and hide the assessed table", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Claims to be assessed",
      }),
    ).toBeVisible();
    await expect(
      claimsPanel.getByRole("heading", { level: 2, name: "Assessed claims" }),
    ).toHaveCount(0);
    await expect(claimsPanel.locator("table")).toHaveCount(1);
  });
});

test.describe("Claims tab - only assessed claims", () => {
  const applicationId = "8";

  test("should show the assessed table and hide the to be assessed table", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", { level: 2, name: "Assessed claims" }),
    ).toBeVisible();
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Claims to be assessed",
      }),
    ).toHaveCount(0);
    await expect(claimsPanel.locator("table")).toHaveCount(1);
  });
});

test.describe("Claims tab - upstream failure", () => {
  const applicationId = "998";

  test("should still render the page and show an unavailable message", async ({
    page,
  }) => {
    await page.goto(`/applications/${applicationId}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(claimsPanel).toContainText(
      "Claims are currently unavailable. Please try again later.",
    );
    await expect(claimsPanel.locator("table")).toHaveCount(0);
  });
});
