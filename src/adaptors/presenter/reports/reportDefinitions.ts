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

export interface DirectDownloadReportDefinition {
  path: string;
  nameKey: string;
}

export const DIRECT_DOWNLOAD_REPORTS: readonly DirectDownloadReportDefinition[] =
  [
    {
      path: "/reports/applications/backlog",
      nameKey: "pages.reports.links.applicationsBacklog.reportName",
    },
    {
      path: "/reports/claims/backlog",
      nameKey: "pages.reports.links.claimsBacklog.reportName",
    },
    {
      path: "/reports/cost-estimation-and-forecasting",
      nameKey: "pages.reports.links.costEstimation.reportName",
    },
  ];

export type ReportDownloadTarget =
  | { kind: "dateRange"; report: DateRangeReportDefinition }
  | { kind: "direct"; report: DirectDownloadReportDefinition };

export function findReportByDownloadPath(
  path: string,
): ReportDownloadTarget | undefined {
  const normalisedPath =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  const dateRangeReport = DATE_RANGE_REPORTS.find(
    ({ slug }) => `/reports/${slug}/download` === normalisedPath,
  );
  if (dateRangeReport !== undefined) {
    return { kind: "dateRange", report: dateRangeReport };
  }

  const directReport = DIRECT_DOWNLOAD_REPORTS.find(
    (report) => report.path === normalisedPath,
  );
  if (directReport !== undefined) {
    return { kind: "direct", report: directReport };
  }

  return undefined;
}
