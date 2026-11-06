export type DateRangeReportKey =
  | "paymentsExtract"
  | "claimsApplicationsProcessing"
  | "costsForOtherDepartments"
  | "userAuditTrail";

export type DateRangeReportResult =
  | {
      status: "SUCCESS";
      data: Buffer;
      contentType: string;
      contentDisposition: string | undefined;
    }
  | { status: "DATE_RANGE_TOO_LONG" };

export interface ReportsPort {
  getApplicationsBacklogReport: (
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
  getClaimsBacklogReport: (
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
  getCostEstimationReport: (accessToken: string | undefined) => Promise<{
    data: Buffer;
    contentType: string;
    contentDisposition: string | undefined;
  }>;
  getDateRangeReport: (
    report: DateRangeReportKey,
    from: string,
    to: string,
    accessToken: string | undefined,
  ) => Promise<DateRangeReportResult>;
}
