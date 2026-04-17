import type { Page } from "@playwright/test";
import { HomePage } from "./HomePage.js";

export class PageFactory {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get homePage(): HomePage {
    return new HomePage(this.page);
  }
}
