import type {
  PaymentExtractReportResult,
  ReportsPort,
} from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";

export class DownloadPaymentExtractReportUseCase {
  constructor(private readonly reportsPort: ReportsPort) {}

  async execute(
    from: string,
    to: string,
    accessToken?: string,
  ): Promise<PaymentExtractReportResult> {
    return await this.reportsPort.getPaymentExtractReport(
      from,
      to,
      accessToken,
    );
  }
}
