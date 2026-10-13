import type { Page } from "@playwright/test";
import { AllApplicationsPage } from "#tests/playwright/fixtures/pages/AllApplicationsPage.js";

export class PageFactory {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get allApplicationsPage(): AllApplicationsPage {
    return new AllApplicationsPage(this.page);
  }
}
