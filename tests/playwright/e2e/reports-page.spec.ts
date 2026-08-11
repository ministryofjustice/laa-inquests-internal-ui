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
});
