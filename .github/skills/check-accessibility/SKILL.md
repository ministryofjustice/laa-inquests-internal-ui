---
name: check-accessibility
description: How to add accessibility testing for a page. Use this when creating E2E tests for a new page in the service.
---

# Creating new pages

Whenever creating end-to-end tests for a new page in the service, check accessibility in one of the tests.

To do this, use the `checkAccessibility` fixture and then run `await checkAccessibility()` at the end.

```ts
test("renders example page", async ({ page, checkAccessibility }) => {
  page.goto("/example/page");

  const heading = await page.getByRole("heading", {
    level: 1,
    name: "Example",
  });
  await expect(heading).toBeVisible();

  await checkAccessibility();
});
```

Piggyback on the test that asserts the page renders correctly.

# Updating old pages

Find tests that run against a page by searching for `page.goto("<PAGE_URL>");`. Review those tests to see if they call `checkAccessibility` before moving onto a new page.
