import { test, expect } from "../fixtures/index.js";
import { validateMojHeader } from "#tests/playwright/utils/govuk-validators.js";
import { CASEWORKER_DISPLAY_NAME } from "#tests/playwright/constants/Caseworker.js";
import {
  INTERNAL_CASEWORKER_ROLES,
  PERMISSIONS,
  PERMISSION_ROLE_MAP,
} from "#src/infrastructure/config/accessControl.js";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Manage inquest legal aid – GOV.UK$/);
  });

  test("should display correct navigation content", async ({ page }) => {
    await validateMojHeader(page);
  });

  test("should display the service name in service navigation", async ({
    page,
  }) => {
    const serviceNavigation = page.locator(".govuk-service-navigation");
    const serviceLink = serviceNavigation.getByRole("link", {
      name: "Manage inquest legal aid",
    });

    await expect(serviceLink).toBeVisible();
    await expect(serviceLink).toHaveAttribute("href", "/");

    await expect(
      page.locator(".moj-header").getByRole("link", {
        name: "Manage inquest legal aid",
      }),
    ).toHaveCount(0);
  });

  test("should return home when the service name is clicked", async ({
    page,
  }) => {
    await page
      .getByRole("link", {
        name: "Find an application or certificate",
      })
      .click();

    await expect(page).toHaveURL("/applications/search");

    await page
      .locator(".govuk-service-navigation")
      .getByRole("link", {
        name: "Manage inquest legal aid",
      })
      .click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "What do you need to do?",
      }),
    ).toBeVisible();
  });

  test("should have the correct link for organisational label", async ({
    page,
  }) => {
    const legalAidAgencyLink = page.getByRole("link", {
      name: "Legal Aid Agency",
    });
    await expect(legalAidAgencyLink).toHaveAttribute("href", "/");
  });

  test("should have the correct link for service label", async ({ page }) => {
    const serviceLink = page
      .locator(".govuk-service-navigation")
      .getByRole("link", {
        name: "Manage inquest legal aid",
      });

    await expect(serviceLink).toHaveAttribute("href", "/");
  });

  test("should have the correct link for sign out button", async ({ page }) => {
    const signOutLink = page.getByRole("link", { name: "Sign out" });
    await expect(signOutLink).toHaveAttribute("href", "/auth/logout");
  });

  test("navigation items should be in correct order", async ({ page }) => {
    const header = page.getByRole("banner");
    const navigation = header.getByRole("navigation", {
      name: "Account navigation",
    });
    const navLinks = navigation.getByRole("link");

    await expect(navLinks.nth(0)).toHaveText(CASEWORKER_DISPLAY_NAME);
    await expect(navLinks.nth(1)).toHaveText("Sign out");
  });

  test("should have the correct panel for applications", async ({ page }) => {
    const applicationsPanel = page.getByRole("region", {
      name: "Applications",
    });
    await expect(applicationsPanel).toBeVisible();
    const applicationsPanelHeading = applicationsPanel.getByRole("heading", {
      name: "Find an application or certificate",
    });
    await expect(applicationsPanelHeading).toBeVisible();
    const applicationsPanelLink = applicationsPanelHeading.getByRole("link", {
      name: "Find an application or certificate",
    });
    await expect(applicationsPanelLink).toHaveAttribute(
      "href",
      "/applications/search",
    );
  });

  test("should have the correct panel for claims", async ({ page }) => {
    const claimsPanel = page.getByRole("region", {
      name: "Claims",
    });
    await expect(claimsPanel).toBeVisible();
    const claimsPanelHeading = claimsPanel.getByRole("heading", {
      name: "Find a claim",
    });
    await expect(claimsPanelHeading).toBeVisible();
    const claimsPanelLink = claimsPanelHeading.getByRole("link", {
      name: "Find a claim",
    });
    await expect(claimsPanelLink).toHaveAttribute("href", "/claims/search");
  });

  test("should have the correct panel for reports", async ({ page }) => {
    const reportsPanel = page.getByRole("region", {
      name: "Reports",
    });
    await expect(reportsPanel).toBeVisible();
    const reportsPanelHeading = reportsPanel.getByRole("heading", {
      name: "Download reports",
    });
    await expect(reportsPanelHeading).toBeVisible();
    const reportsPanelLink = reportsPanelHeading.getByRole("link", {
      name: "Download reports",
    });
    await expect(reportsPanelLink).toHaveAttribute("href", "/reports");
  });

  test.describe("Footer", () => {
    test("navigates to the cookies page", async ({ page }) => {
      await page.goto("/");

      const cookiesLink = page.getByRole("link", {
        name: "Cookies",
        exact: true,
      });
      await expect(cookiesLink).toHaveAttribute("href", "/cookies");
      await cookiesLink.click();
      await expect(page).toHaveURL("/cookies");
    });
  });

  test.describe("RBAC", () => {
    test.afterEach(async ({ page }) => {
      await page.goto("/auth/test-login");
    });

    test("should show applications panel for users with the SEARCH_APPLICATIONS permission", async ({
      page,
    }) => {
      const allowedRoles = PERMISSION_ROLE_MAP[PERMISSIONS.SEARCH_APPLICATIONS];
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/");
        const applicationsPanel = page.getByRole("region", {
          name: "Applications",
        });
        await expect(applicationsPanel).toBeVisible();
      }
    });

    test("should not show applications panel for users without the SEARCH_APPLICATIONS permission", async ({
      page,
    }) => {
      const allowedRoles = PERMISSION_ROLE_MAP[PERMISSIONS.SEARCH_APPLICATIONS];

      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES).filter(
        (r) => !allowedRoles.includes(r),
      )) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/");
        const applicationsPanel = page.getByRole("region", {
          name: "Applications",
        });
        await expect(applicationsPanel).not.toBeVisible();
      }
    });

    test("should show claims panel for users with the VIEW_CLAIMS_TAB permission", async ({
      page,
    }) => {
      const allowedRoles = PERMISSION_ROLE_MAP[PERMISSIONS.VIEW_CLAIMS_TAB];
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/");
        const claimsPanel = page.getByRole("region", {
          name: "Claims",
        });
        await expect(claimsPanel).toBeVisible();
      }
    });

    test("should not show claims panel for users without the VIEW_CLAIMS_TAB permission", async ({
      page,
    }) => {
      const allowedRoles = PERMISSION_ROLE_MAP[PERMISSIONS.VIEW_CLAIMS_TAB];

      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES).filter(
        (r) => !allowedRoles.includes(r),
      )) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/");
        const claimsPanel = page.getByRole("region", {
          name: "Claims",
        });
        await expect(claimsPanel).not.toBeVisible();
      }
    });

    test("should show reports panel for users with the VIEW_REPORTS_PAGE permission", async ({
      page,
    }) => {
      const allowedRoles = PERMISSION_ROLE_MAP[PERMISSIONS.VIEW_REPORTS_PAGE];
      for (const role of allowedRoles) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/");
        const reportsPanel = page.getByRole("region", {
          name: "Reports",
        });
        await expect(reportsPanel).toBeVisible();
      }
    });

    test("should not show reports panel for users without the VIEW_REPORTS_PAGE permission", async ({
      page,
    }) => {
      const allowedRoles = PERMISSION_ROLE_MAP[PERMISSIONS.VIEW_REPORTS_PAGE];

      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES).filter(
        (r) => !allowedRoles.includes(r),
      )) {
        await page.goto(`/auth/test-login?overrideRoles=${role}`);
        await page.goto("/");
        const reportsPanel = page.getByRole("region", {
          name: "Reports",
        });
        await expect(reportsPanel).not.toBeVisible();
      }
    });
  });
});
