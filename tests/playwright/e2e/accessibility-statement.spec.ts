import { expect, test } from "../fixtures/index.js";

test("renders the blank accessibility statement page", async ({
  page,
  checkAccessibility,
}) => {
  const response = await page.goto("/accessibility-statement");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/accessibility-statement$/);
  await expect(page.locator("main")).toHaveText("");

  await checkAccessibility();
});
