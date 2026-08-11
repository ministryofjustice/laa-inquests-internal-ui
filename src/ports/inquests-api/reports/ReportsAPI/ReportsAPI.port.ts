export interface ReportsPort {
  getApplicationsBacklogReport: (
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
  getClaimsBacklogReport: (
    accessToken: string | undefined,
  ) => Promise<{ data: Buffer; contentType: string }>;
}
