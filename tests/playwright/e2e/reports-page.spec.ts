import { test, expect } from "../fixtures/index.js";

test.describe("Reports page", () => {
  test("displays reports heading and backlog download link", async ({
    page,
  }) => {
    await page.goto("/reports");

    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(
      page.getByText(
        "This page is not production ready and is intended for developers.",
      ),
    ).toBeVisible();

    const backlogLink = page.getByRole("link", {
      name: "Download Applications Backlog",
    });

    await expect(backlogLink).toBeVisible();
    await expect(backlogLink).toHaveAttribute(
      "href",
      "/reports/applications/backlog",
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
});
