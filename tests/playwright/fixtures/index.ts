import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { PageFactory } from "#tests/playwright/fixtures/pages/PageFactory.js";
import { JOURNEYS } from "#src/infrastructure/config/journeySequences.js";

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
  freshSession: void;
}

const authorizedPages = new WeakMap<Page, boolean>();

const authorizeTestForJourneyStep = async (
  page: Page,
  pageUrl: string,
): Promise<void> => {
  const path = getAbstractedPage(pageUrl);
  let journeyType: string | undefined;
  let stepIndex: number;

  const journey = Object.entries(JOURNEYS).find(([_, steps]) =>
    steps.includes(path),
  );
  journeyType = journey ? journey[0] : undefined;
  stepIndex = journey ? journey[1].indexOf(path) : 0;

  const lastCompletedIndex = stepIndex > 0 ? stepIndex - 1 : -1;
  await page.request.get(
    `/auth/test-login?journeyStep=${lastCompletedIndex}&journeyType=${journeyType}`,
    { maxRedirects: 0 },
  );
};

function getAbstractedPage(pageToMark: string): string {
  const noQueryUrl = pageToMark.split("?").at(0) ?? pageToMark;
  const abstractedApplicationPage = noQueryUrl.replace(
    /INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/v,
    "INQ-[A-Z0-9]{3}-[A-Z0-9]{3}",
  );
  return abstractedApplicationPage.replace(
    /INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/v,
    "INQC-[A-Z0-9]{4}-[A-Z0-9]{4}",
  );
}

export const test = base.extend<TestFixtures>({
  freshSession: [
    async ({ page, context }, use): Promise<void> => {
      const cookies = await context.cookies();
      if (cookies.length > 0) {
        await context.clearCookies();
        await page.goto("/auth/test-login"); // TODO: Figure out why removing this breaks the date range reports
      }
      const originalGoto = page.goto.bind(page);
      page.goto = async (url: string | URL, options?: any) => {
        const urlString = url.toString();
        if (!authorizedPages.has(page)) {
          await authorizeTestForJourneyStep(page, urlString);
          authorizedPages.set(page, true);
        }
        return originalGoto(urlString, options);
      };

      await use();
    },
    { auto: true },
  ],

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
