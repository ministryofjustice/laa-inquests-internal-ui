import type {
  DateRangeReportKey,
  DateRangeReportResult,
  ReportsPort,
} from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";

export class DownloadDateRangeReportUseCase {
  constructor(private readonly reportsPort: ReportsPort) {}

  async execute(
    report: DateRangeReportKey,
    from: string,
    to: string,
    accessToken?: string,
  ): Promise<DateRangeReportResult> {
    return await this.reportsPort.getDateRangeReport(
      report,
      from,
      to,
      accessToken,
    );
  }
}
