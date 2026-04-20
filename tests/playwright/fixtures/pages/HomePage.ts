import type { Page, Locator } from '@playwright/test';
import { TEST_CONFIG } from '#tests/playwright/playwright.config.js';

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

  get mountainsTable(): Locator {
    return this.page.locator("table");
  }

  get tableCaption(): Locator {
    return this.page.locator("caption");
  }

  getMountainRow(mountainName: string): Locator {
    return this.page.locator(`tr:has-text("${mountainName}")`);
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

  async getMountainNames(): Promise<string[]> {
    const rows = this.page.locator("tbody tr");
    const count = await rows.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const firstCell = rows.nth(i).locator("td").first();
      const name = await firstCell.textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }
}
