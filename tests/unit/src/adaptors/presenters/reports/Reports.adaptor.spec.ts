import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";

describe("Reports adaptor", () => {
  let reportsAdaptor: ReportsAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let applicationPortStub: StubbedInstance<ApplicationPort>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    requestStub = stubInterface<Request>();
    applicationPortStub = stubInterface<ApplicationPort>();
    requestStub.session = {
      user: {
        accessToken: "test-access-token",
      },
    } as never;
    reportsAdaptor = new ReportsAdaptor(applicationPortStub);
  });

  it("renders reports page", () => {
    reportsAdaptor.renderReportsPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, ["reports/index"]);
  });

  it("downloads applications backlog report with attachment headers", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    applicationPortStub.getApplicationsBacklogReport.resolves({
      data: mockBuffer,
      contentType: "text/csv",
    });

    await reportsAdaptor.downloadApplicationsBacklog(requestStub, responseStub);

    assert.equal(applicationPortStub.getApplicationsBacklogReport.callCount, 1);
    assert.deepEqual(
      applicationPortStub.getApplicationsBacklogReport.firstCall.args,
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
    applicationPortStub.getApplicationsBacklogReport.rejects(
      new Error("API error"),
    );
    responseStub.status.returns(responseStub);

    await reportsAdaptor.downloadApplicationsBacklog(requestStub, responseStub);

    assert.equal(applicationPortStub.getApplicationsBacklogReport.callCount, 1);
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
