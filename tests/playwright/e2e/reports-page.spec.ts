import { test, expect } from "../fixtures/index.js";

test.describe("Reports page", () => {
  test("displays reports heading and backlog download links", async ({
    page,
  }) => {
    await page.goto("/reports");

    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(
      page.getByText(
        "This page is not production ready and is intended for developers.",
      ),
    ).toBeVisible();

    const applicationsBacklogLink = page.getByRole("link", {
      name: "Download Applications Backlog",
    });
    const claimsBacklogLink = page.getByRole("link", {
      name: "Download Claims Backlog",
    });

    await expect(applicationsBacklogLink).toBeVisible();
    await expect(applicationsBacklogLink).toHaveAttribute(
      "href",
      "/reports/applications/backlog",
    );
    await expect(claimsBacklogLink).toBeVisible();
    await expect(claimsBacklogLink).toHaveAttribute(
      "href",
      "/reports/claims/backlog",
    );
  });

  test("download link returns csv attachment response", async ({ page }) => {
    await page.goto("/reports");

    const backlogResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/reports/applications/backlog") &&
        response.request().method() === "GET",
    );

    await page
      .getByRole("link", { name: "Download Applications Backlog" })
      .click();

    const backlogResponse = await backlogResponsePromise;

    expect(backlogResponse.status()).toBe(200);
    expect(backlogResponse.headers()["content-type"]).toContain("text/csv");
    expect(backlogResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });

  test("claims download link returns csv attachment response", async ({
    page,
  }) => {
    await page.goto("/reports");

    const claimsBacklogResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/reports/claims/backlog") &&
        response.request().method() === "GET",
    );

    await page.getByRole("link", { name: "Download Claims Backlog" }).click();

    const claimsBacklogResponse = await claimsBacklogResponsePromise;

    expect(claimsBacklogResponse.status()).toBe(200);
    expect(claimsBacklogResponse.headers()["content-type"]).toContain(
      "text/csv",
    );
    expect(claimsBacklogResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
  });
});
