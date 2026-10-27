import type { Page } from "@playwright/test";

export async function startFreshTestSession(page: Page): Promise<void> {
  const context = page.context();
  const cookies = await context.cookies();

  if (cookies.length > 0) {
    await context.clearCookies();
  }

  await page.goto("/auth/test-login");
}
