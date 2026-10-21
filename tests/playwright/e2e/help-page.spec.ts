import { expect, test } from "../fixtures/index.js";

test("opens the blank help page from the footer", async ({
  page,
  checkAccessibility,
}) => {
  await page.goto("/");

  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/help" &&
        response.request().isNavigationRequest(),
    ),
    page.getByRole("link", { name: "Help", exact: true }).click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/help\/?$/);
  await expect(page.locator("main")).toHaveText("");

  await checkAccessibility();
});
