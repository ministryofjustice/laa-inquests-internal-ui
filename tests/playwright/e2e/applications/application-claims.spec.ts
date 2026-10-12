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
  const laaReference = "INQ-YYY-005";

  test("should show the total section", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${laaReference}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");

    await validateHeader(page, "Total", 2);
    await expect(
      claimsPanel.locator("p", { hasText: "Substantive certificate:" }),
    ).toContainText("£10,000");
    await expect(
      claimsPanel.locator("p", { hasText: "Total remaining:" }),
    ).toContainText("£8,000");
    await checkAccessibility();
  });

  test("should show the claims to be assessed table", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${laaReference}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Claims to be assessed",
      }),
    ).toBeVisible();

    const table = claimsPanel.locator("table", {
      has: page.locator(
        `a[href="/applications/${laaReference}/claims/INQC-0010-0010"]`,
      ),
    });

    const headers = table.locator("thead th");
    await expect(headers).toHaveText([
      "Claim reference",
      "Date",
      "Type of claim",
      "Total amount",
      "Status",
    ]);

    const row = table.locator("tbody tr", {
      has: page.locator(
        `a[href="/applications/${laaReference}/claims/INQC-0010-0010"]`,
      ),
    });
    await expect(row).toContainText("10 August 2026");
    await expect(row).toContainText("£1,200");
    await expect(row).toContainText("Submitted");
    await expect(row).toContainText("Payment on account");
    await expect(row.locator("td")).toHaveText([
      "INQC-0010-0010",
      "10 August 2026",
      "Payment on account",
      "£1,200",
      "Submitted",
    ]);
    const statusTag = row.locator("td").nth(4).locator(".govuk-tag");
    await expect(statusTag).toHaveCount(1);
    await expect(statusTag).toHaveText("Submitted");
    await expect(statusTag).toHaveClass("govuk-tag govuk-tag--blue");
    await expect(
      row.getByRole("link", { name: "INQC-0010-0010" }),
    ).toHaveAttribute(
      "href",
      `/applications/${laaReference}/claims/INQC-0010-0010`,
    );
    await checkAccessibility();
  });

  test("should show the assessed claims table", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${laaReference}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(
      claimsPanel.getByRole("heading", {
        level: 2,
        name: "Assessed claims",
      }),
    ).toBeVisible();

    const table = claimsPanel.locator("table", {
      has: page.locator(
        `a[href="/applications/${laaReference}/claims/INQC-0020-0020"]`,
      ),
    });

    const headers = table.locator("thead th");
    await expect(headers).toHaveText([
      "Claim reference",
      "Date",
      "Type of claim",
      "Total amount",
      "Status",
    ]);

    const row = table.locator("tbody tr").first();
    await expect(row).toContainText("01 July 2026");
    await expect(row).toContainText("£2,000");
    await expect(row).toContainText("Pay in full");
    await expect(row).toContainText("Payment on account");
    await expect(row.locator("td")).toHaveText([
      "INQC-0020-0020",
      "01 July 2026",
      "Payment on account",
      "£2,000",
      "Pay in full",
    ]);
    const statusTag = row.locator("td").nth(4).locator(".govuk-tag");
    await expect(statusTag).toHaveCount(1);
    await expect(statusTag).toHaveText("Pay in full");
    await expect(statusTag).toHaveClass("govuk-tag govuk-tag--green");
    await expect(
      row.getByRole("link", { name: "INQC-0020-0020" }),
    ).toHaveAttribute(
      "href",
      `/applications/${laaReference}/claims/INQC-0020-0020`,
    );
    await checkAccessibility();
  });

  test("shows a red Rejected tag in the final column for a rejected claim", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto(`/applications/${laaReference}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const row = page.locator("#claims tbody tr", {
      has: page.getByRole("link", { name: "INQC-0017-0017", exact: true }),
    });
    await expect(row.locator("td")).toHaveText([
      "INQC-0017-0017",
      "01 June 2026",
      "Payment on account",
      "£1,200",
      "Rejected",
    ]);

    const statusTag = row.locator("td").nth(4).locator(".govuk-tag");
    await expect(statusTag).toHaveCount(1);
    await expect(statusTag).toHaveText("Rejected");
    await expect(statusTag).toHaveClass("govuk-tag govuk-tag--red");
    await expect(
      row.getByRole("link", { name: "INQC-0017-0017" }),
    ).toHaveAttribute(
      "href",
      `/applications/${laaReference}/claims/INQC-0017-0017`,
    );
    await checkAccessibility();
  });
});

test.describe("Claims tab - empty state", () => {
  const laaReference = "INQ-YYY-007";

  test("should show the no claims message and no tables", async ({ page }) => {
    await page.goto(`/applications/${laaReference}/overview`);
    await page.getByRole("tab", { name: "Claims" }).click();

    const claimsPanel = page.locator("#claims");
    await expect(claimsPanel).toContainText(
      "There are no claims associated with this application yet.",
    );
    await expect(claimsPanel.locator("table")).toHaveCount(0);
  });
});

test.describe("Claims tab - only claims to be assessed", () => {
  const laaReference = "INQ-YYY-006";

  test("should show the to be assessed table and hide the assessed table", async ({
    page,
  }) => {
    await page.goto(`/applications/${laaReference}/overview`);
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
  const laaReference = "INQ-YYY-008";

  test("should show the assessed table and hide the to be assessed table", async ({
    page,
  }) => {
    await page.goto(`/applications/${laaReference}/overview`);
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

test.describe("Claims - upstream failure", () => {
  const laaReference = "INQ-YYY-998";

  test("shows the generic error page", async ({ page }) => {
    const response = await page.goto(`/applications/${laaReference}/overview`);

    expect(response?.status()).toBe(500);
    await expect(page.getByRole("heading", { name: "500" })).toBeVisible();
  });
});
