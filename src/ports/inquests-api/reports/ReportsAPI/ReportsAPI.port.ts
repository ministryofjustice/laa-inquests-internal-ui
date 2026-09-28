export interface ReportsPort {
  getApplicationsBacklogReport: (
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
  getClaimsBacklogReport: (
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
  getPaymentExtractReport: (
    from: string,
    to: string,
    accessToken: string | undefined,
  ) => Promise<{
    data: Buffer;
    contentType: string;
    contentDisposition: string | undefined;
  }>;
}
