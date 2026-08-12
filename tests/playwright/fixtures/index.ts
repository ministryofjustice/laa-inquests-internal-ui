import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { PageFactory } from "#tests/playwright/fixtures/pages/PageFactory.js";

async function runAccessibilityScan(page: Page): Promise<void> {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22a",
      "wcag22aa",
    ])
    .disableRules(["aria-allowed-attr"]) // https://mojdt.slack.com/archives/C0125N0T3J7/p1667492016233769
    .analyze();

  const { violations } = accessibilityScanResults;
  expect(violations).toEqual([]);
}

/**
 * Custom test fixture with accessibility testing
 */
interface TestFixtures {
  checkAccessibility: () => Promise<void>;
  checkPageAccessibility: (page: Page) => Promise<void>;
  pages: PageFactory;
}

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use): Promise<void> => {
    await use(page);
  },

  checkPageAccessibility: async ({ page: _page }, use): Promise<void> => {
    const checkPageAccessibility = async (pageToCheck: Page): Promise<void> => {
      await runAccessibilityScan(pageToCheck);
    };

    await use(checkPageAccessibility);
  },

  checkAccessibility: async ({ page }, use): Promise<void> => {
    // Checks current page
    const checkAccessibility = async (): Promise<void> => {
      await runAccessibilityScan(page);
    };
    await use(checkAccessibility);
  },

  // Fixture that provides page object factory for creating page instances
  pages: async ({ page }, use): Promise<void> => {
    const pageFactory = new PageFactory(page);
    await use(pageFactory);
  },
});

export { expect } from "@playwright/test";
