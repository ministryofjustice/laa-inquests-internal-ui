import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";

describe("Reports adaptor", () => {
  let reportsAdaptor: ReportsAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let downloadApplicationsBacklogReportUseCaseStub: StubbedInstance<DownloadApplicationsBacklogReportUseCase>;
  let downloadClaimsBacklogReportUseCaseStub: StubbedInstance<DownloadClaimsBacklogReportUseCase>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    downloadApplicationsBacklogReportUseCaseStub =
      stubInterface<DownloadApplicationsBacklogReportUseCase>();
    downloadClaimsBacklogReportUseCaseStub =
      stubInterface<DownloadClaimsBacklogReportUseCase>();
    requestStub.session = {
      user: {
        accessToken: "test-access-token",
      },
    } as never;
    reportsAdaptor = new ReportsAdaptor({
      downloadApplicationsBacklogReportUseCase:
        downloadApplicationsBacklogReportUseCaseStub,
      downloadClaimsBacklogReportUseCase:
        downloadClaimsBacklogReportUseCaseStub,
    });
  });

  it("renders reports page", () => {
    reportsAdaptor.renderReportsPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, ["reports/index"]);
  });

  it("downloads applications backlog report with attachment headers", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    downloadApplicationsBacklogReportUseCaseStub.execute.resolves({
      data: mockBuffer,
      contentType: "text/csv",
    });

    await reportsAdaptor.downloadApplicationsBacklog(requestStub, responseStub);

    assert.equal(
      downloadApplicationsBacklogReportUseCaseStub.execute.callCount,
      1,
    );
    assert.deepEqual(
      downloadApplicationsBacklogReportUseCaseStub.execute.firstCall.args,
      ["test-access-token"],
    );
    assert.equal(responseStub.setHeader.callCount, 2);
    assert.deepEqual(responseStub.setHeader.getCall(0).args, [
      "Content-Type",
      "text/csv",
    ]);
    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      'attachment; filename="applications-backlog.csv"',
    ]);
    assert.equal(responseStub.send.callCount, 1);
    assert.deepEqual(responseStub.send.firstCall.args, [mockBuffer]);
  });

  it("propagates applications report failures without writing a response", async () => {
    const error = new Error("API error");
    downloadApplicationsBacklogReportUseCaseStub.execute.rejects(error);

    await assert.rejects(
      reportsAdaptor.downloadApplicationsBacklog(requestStub, responseStub),
      (thrown: unknown) => thrown === error,
    );

    assert.equal(responseStub.setHeader.callCount, 0);
    assert.equal(responseStub.send.callCount, 0);
  });

  it("downloads claims backlog report with attachment headers", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    downloadClaimsBacklogReportUseCaseStub.execute.resolves({
      data: mockBuffer,
      contentType: "text/csv",
    });

    await reportsAdaptor.downloadClaimsBacklog(requestStub, responseStub);

    assert.equal(downloadClaimsBacklogReportUseCaseStub.execute.callCount, 1);
    assert.deepEqual(
      downloadClaimsBacklogReportUseCaseStub.execute.firstCall.args,
      ["test-access-token"],
    );
    assert.equal(responseStub.setHeader.callCount, 2);
    assert.deepEqual(responseStub.setHeader.getCall(0).args, [
      "Content-Type",
      "text/csv",
    ]);
    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      'attachment; filename="claims-backlog.csv"',
    ]);
    assert.equal(responseStub.send.callCount, 1);
    assert.deepEqual(responseStub.send.firstCall.args, [mockBuffer]);
  });

  it("propagates claims report failures without writing a response", async () => {
    const error = new Error("API error");
    downloadClaimsBacklogReportUseCaseStub.execute.rejects(error);

    await assert.rejects(
      reportsAdaptor.downloadClaimsBacklog(requestStub, responseStub),
      (thrown: unknown) => thrown === error,
    );

    assert.equal(responseStub.setHeader.callCount, 0);
    assert.equal(responseStub.send.callCount, 0);
  });
});
