import type { Page, Locator } from "@playwright/test";
import { TEST_CONFIG } from "#tests/playwright/playwright.config.js";

/**
 * Page object for the home page
 */
export class HomePage {
  private readonly page: Page;
  private readonly url: string;

  constructor(page: Page) {
    this.page = page;
    this.url = TEST_CONFIG.BASE_URL + "/";
  }

  get heading(): Locator {
    return this.page.locator("h1.govuk-heading-xl");
  }

  get developerBanner(): Locator {
    return this.page.locator(".govuk-warning-text");
  }

  get applicationsTable(): Locator {
    return this.page.locator("table");
  }

  get tableCaption(): Locator {
    return this.page.locator("caption");
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  async getServiceName(): Promise<string> {
    return (await this.heading.textContent()) || "";
  }

  async getApplicationReferences(): Promise<string[]> {
    const rows = this.page.locator("tbody tr");
    const count = await rows.count();
    const references: string[] = [];

    for (let i = 0; i < count; i++) {
      const firstCell = rows.nth(i).locator("td").first();
      const reference = await firstCell.textContent();
      if (reference) {
        references.push(reference.trim());
      }
    }

    return references;
  }
}
