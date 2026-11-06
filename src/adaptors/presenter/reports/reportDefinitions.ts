import {
  PERMISSIONS,
  type Permission,
} from "#src/infrastructure/config/accessControl.js";
import type { DateRangeReportKey } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";

export interface DateRangeReportDefinition {
  key: DateRangeReportKey;
  slug: string;
  maxDays: number;
  permission: Permission;
  rateLimitLabel: string;
}

export const DATE_RANGE_REPORTS: readonly DateRangeReportDefinition[] = [
  {
    key: "paymentsExtract",
    slug: "payments-extract",
    maxDays: 30,
    permission: PERMISSIONS.VIEW_PAYMENT_EXTRACT_REPORT,
    rateLimitLabel: "Payments extract",
  },
  {
    key: "claimsApplicationsProcessing",
    slug: "claims-applications-processing",
    maxDays: 30,
    permission: PERMISSIONS.VIEW_DECISIONS_REPORT,
    rateLimitLabel: "Claims and applications processing",
  },
  {
    key: "costsForOtherDepartments",
    slug: "costs-for-other-departments",
    maxDays: 90,
    permission: PERMISSIONS.VIEW_OGD_COSTS_REPORT,
    rateLimitLabel: "Costs for other departments",
  },
  {
    key: "userAuditTrail",
    slug: "user-audit-trail",
    maxDays: 30,
    permission: PERMISSIONS.VIEW_AUDIT_TRAIL_REPORT,
    rateLimitLabel: "User audit trail",
  },
];

export function findDateRangeReport(
  slug: string,
): DateRangeReportDefinition | undefined {
  return DATE_RANGE_REPORTS.find((report) => report.slug === slug);
}
