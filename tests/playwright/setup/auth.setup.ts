import { test as setup } from "@playwright/test";
import { AUTH_FILE } from "#tests/playwright/constants/AuthFile.js";

setup("authenticate caseworker via test-login", async ({ page }) => {
  await page.goto("/auth/test-login");
  await page.waitForURL("/");
  await page.context().storageState({ path: AUTH_FILE });
});
