import { strict as assert } from "assert";
import {
  DATE_RANGE_REPORTS,
  findDateRangeReport,
} from "#src/adaptors/presenter/reports/reportDefinitions.js";
import {
  PERMISSIONS,
  PERMISSION_ROLE_MAP,
} from "#src/infrastructure/config/accessControl.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

describe("Date range report definitions", () => {
  it("defines the four date range reports with their url slug, limit and permission", () => {
    const summary = DATE_RANGE_REPORTS.map(
      ({ key, slug, maxDays, permission }) => ({
        key,
        slug,
        maxDays,
        permission,
      }),
    );

    assert.deepEqual(summary, [
      {
        key: "paymentsExtract",
        slug: "payments-extract",
        maxDays: 30,
        permission: PERMISSIONS.VIEW_PAYMENT_EXTRACT_REPORT,
      },
      {
        key: "claimsApplicationsProcessing",
        slug: "claims-applications-processing",
        maxDays: 30,
        permission: PERMISSIONS.VIEW_DECISIONS_REPORT,
      },
      {
        key: "costsForOtherDepartments",
        slug: "costs-for-other-departments",
        maxDays: 90,
        permission: PERMISSIONS.VIEW_OGD_COSTS_REPORT,
      },
      {
        key: "userAuditTrail",
        slug: "user-audit-trail",
        maxDays: 30,
        permission: PERMISSIONS.VIEW_AUDIT_TRAIL_REPORT,
      },
    ]);
  });

  it("uses a unique slug and rate limit label for every report", () => {
    const slugs = DATE_RANGE_REPORTS.map(({ slug }) => slug);
    const labels = DATE_RANGE_REPORTS.map(
      ({ rateLimitLabel }) => rateLimitLabel,
    );

    assert.equal(new Set(slugs).size, DATE_RANGE_REPORTS.length);
    assert.equal(new Set(labels).size, DATE_RANGE_REPORTS.length);
  });

  it("only uses permissions that are mapped to roles", () => {
    for (const { permission } of DATE_RANGE_REPORTS) {
      assert.ok(
        PERMISSION_ROLE_MAP[permission].length > 0,
        `${permission} has no roles`,
      );
    }
  });

  it("has page content for every report in the locale file", () => {
    const { dateRange: content } = en.pages.reports;

    for (const { key } of DATE_RANGE_REPORTS) {
      const { heading, description, startHint, endHint } = content[key];
      for (const text of [heading, description, startHint, endHint]) {
        assert.ok(text.length > 0, `${key} has empty content`);
      }
    }
  });

  it("finds a report by its url slug", () => {
    assert.equal(
      findDateRangeReport("user-audit-trail")?.key,
      "userAuditTrail",
    );
  });

  it("returns undefined for an unknown slug", () => {
    assert.equal(findDateRangeReport("payment-extract"), undefined);
  });
});
