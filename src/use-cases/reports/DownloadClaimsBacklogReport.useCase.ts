import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";

export class DownloadClaimsBacklogReportUseCase {
  constructor(private readonly reportsPort: ReportsPort) {}

  async execute(
    accessToken?: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    return await this.reportsPort.getClaimsBacklogReport(accessToken);
  }
}
