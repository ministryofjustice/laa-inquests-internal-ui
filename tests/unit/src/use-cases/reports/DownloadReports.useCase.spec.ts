import { strict as assert } from "assert";
import { stubInterface } from "ts-sinon";
import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import { DownloadPaymentExtractReportUseCase } from "#src/use-cases/reports/DownloadPaymentExtractReport.useCase.js";

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

  it("downloads the payment extract for a date range through the reports port", async () => {
    const reportsPort = stubInterface<ReportsPort>();
    const report = {
      status: "SUCCESS" as const,
      data: Buffer.from("csv"),
      contentType: "text/csv",
      contentDisposition: "attachment; filename=payment_extract.csv",
    };
    reportsPort.getPaymentExtractReport.resolves(report);
    const useCase = new DownloadPaymentExtractReportUseCase(reportsPort);

    assert.deepEqual(
      await useCase.execute("2026-09-01", "2026-09-25", "token"),
      report,
    );
    assert.deepEqual(reportsPort.getPaymentExtractReport.firstCall.args, [
      "2026-09-01",
      "2026-09-25",
      "token",
    ]);
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
