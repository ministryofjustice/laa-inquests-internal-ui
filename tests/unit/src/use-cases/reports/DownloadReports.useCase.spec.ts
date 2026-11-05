import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import { DownloadCostEstimationReportUseCase } from "#src/use-cases/reports/DownloadCostEstimationReport.useCase.js";
import { DownloadDateRangeReportUseCase } from "#src/use-cases/reports/DownloadDateRangeReport.useCase.js";

describe("Report download use cases", () => {
  it("downloads the applications backlog through the reports port", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    const report = { data: Buffer.from("csv"), contentType: "text/csv" };
    reportsPort.getApplicationsBacklogReport.resolves(report);
    const useCase = new DownloadApplicationsBacklogReportUseCase(reportsPort);

    assert.deepEqual(await useCase.execute("token"), report);
    assert.deepEqual(reportsPort.getApplicationsBacklogReport.firstCall.args, [
      "token",
    ]);
  });

  it("downloads the claims backlog through the reports port", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    const report = { data: Buffer.from("csv"), contentType: "text/csv" };
    reportsPort.getClaimsBacklogReport.resolves(report);
    const useCase = new DownloadClaimsBacklogReportUseCase(reportsPort);

    assert.deepEqual(await useCase.execute("token"), report);
    assert.deepEqual(reportsPort.getClaimsBacklogReport.firstCall.args, [
      "token",
    ]);
  });

  it("downloads the cost estimation report through the reports port", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    const report = {
      data: Buffer.from("csv"),
      contentType: "text/csv",
      contentDisposition: "attachment; filename=forecast.csv",
    };
    reportsPort.getCostEstimationReport.resolves(report);
    const useCase = new DownloadCostEstimationReportUseCase(reportsPort);

    assert.deepEqual(await useCase.execute("token"), report);
    assert.deepEqual(reportsPort.getCostEstimationReport.firstCall.args, [
      "token",
    ]);
  });

  it("downloads a date range report for a date range through the reports port", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    const report = {
      status: "SUCCESS" as const,
      data: Buffer.from("csv"),
      contentType: "text/csv",
      contentDisposition: "attachment; filename=payment_extract.csv",
    };
    reportsPort.getDateRangeReport.resolves(report);
    const useCase = new DownloadDateRangeReportUseCase(reportsPort);

    assert.deepEqual(
      await useCase.execute(
        "userAuditTrail",
        "2026-09-01",
        "2026-09-25",
        "token",
      ),
      report,
    );
    assert.deepEqual(reportsPort.getDateRangeReport.firstCall.args, [
      "userAuditTrail",
      "2026-09-01",
      "2026-09-25",
      "token",
    ]);
  });

  it("passes on a date range rejection from the reports port", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    reportsPort.getDateRangeReport.resolves({ status: "DATE_RANGE_TOO_LONG" });
    const useCase = new DownloadDateRangeReportUseCase(reportsPort);

    assert.deepEqual(
      await useCase.execute(
        "paymentsExtract",
        "2026-01-01",
        "2026-09-25",
        "token",
      ),
      { status: "DATE_RANGE_TOO_LONG" },
    );
  });

  it("propagates report download failures unchanged", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    const error = new Error("report failed");
    reportsPort.getClaimsBacklogReport.rejects(error);
    const useCase = new DownloadClaimsBacklogReportUseCase(reportsPort);

    await assert.rejects(
      useCase.execute(),
      (thrown: unknown) => thrown === error,
    );
  });
});
