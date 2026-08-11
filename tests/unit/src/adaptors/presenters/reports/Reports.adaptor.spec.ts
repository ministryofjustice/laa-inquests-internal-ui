import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import type { ReportsPort } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";

describe("Reports adaptor", () => {
  let reportsAdaptor: ReportsAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let reportsPortStub: StubbedInstance<ReportsPort>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    reportsPortStub = stubInterface<ReportsPort>();
    requestStub.session = {
      user: {
        accessToken: "test-access-token",
      },
    } as never;
    reportsAdaptor = new ReportsAdaptor(reportsPortStub);
  });

  it("renders reports page", () => {
    reportsAdaptor.renderReportsPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, ["reports/index"]);
  });

  it("downloads applications backlog report with attachment headers", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    reportsPortStub.getApplicationsBacklogReport.resolves({
      data: mockBuffer,
      contentType: "text/csv",
    });

    await reportsAdaptor.downloadApplicationsBacklog(requestStub, responseStub);

    assert.equal(reportsPortStub.getApplicationsBacklogReport.callCount, 1);
    assert.deepEqual(
      reportsPortStub.getApplicationsBacklogReport.firstCall.args,
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

  it("renders error page when backlog report retrieval fails", async () => {
    reportsPortStub.getApplicationsBacklogReport.rejects(
      new Error("API error"),
    );
    responseStub.status.returns(responseStub);

    await reportsAdaptor.downloadApplicationsBacklog(requestStub, responseStub);

    assert.equal(reportsPortStub.getApplicationsBacklogReport.callCount, 1);
    assert.equal(responseStub.status.callCount, 1);
    assert.deepEqual(responseStub.status.firstCall.args, [500]);
    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "application/error",
      {
        status: "Unable to retrieve report",
        error: "Unable to retrieve report. Please try again later",
      },
    ]);
    assert.equal(responseStub.send.callCount, 0);
  });

  it("downloads claims backlog report with attachment headers", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    reportsPortStub.getClaimsBacklogReport.resolves({
      data: mockBuffer,
      contentType: "text/csv",
    });

    await reportsAdaptor.downloadClaimsBacklog(requestStub, responseStub);

    assert.equal(reportsPortStub.getClaimsBacklogReport.callCount, 1);
    assert.deepEqual(reportsPortStub.getClaimsBacklogReport.firstCall.args, [
      "test-access-token",
    ]);
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

  it("renders error page when claims backlog report retrieval fails", async () => {
    reportsPortStub.getClaimsBacklogReport.rejects(new Error("API error"));
    responseStub.status.returns(responseStub);

    await reportsAdaptor.downloadClaimsBacklog(requestStub, responseStub);

    assert.equal(reportsPortStub.getClaimsBacklogReport.callCount, 1);
    assert.equal(responseStub.status.callCount, 1);
    assert.deepEqual(responseStub.status.firstCall.args, [500]);
    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "application/error",
      {
        status: "Unable to retrieve report",
        error: "Unable to retrieve report. Please try again later",
      },
    ]);
    assert.equal(responseStub.send.callCount, 0);
  });
});
