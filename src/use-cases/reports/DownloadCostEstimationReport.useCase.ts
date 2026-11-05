import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";

export class DownloadCostEstimationReportUseCase {
  constructor(private readonly reportsPort: ReportsPort) {}

  async execute(accessToken?: string): Promise<{
    data: Buffer;
    contentType: string;
    contentDisposition: string | undefined;
  }> {
    return await this.reportsPort.getCostEstimationReport(accessToken);
  }
}
