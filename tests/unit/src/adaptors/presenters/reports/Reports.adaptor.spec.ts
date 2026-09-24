import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import type { PaymentExtractValidator } from "#src/adaptors/presenter/reports/PaymentExtract/PaymentExtract.validator.js";
import { PAYMENT_EXTRACT_PLACEHOLDER_CSV } from "#src/infrastructure/locales/constants.js";
import { HTTP_BAD_REQUEST } from "#src/infrastructure/express/constants.js";

const VALID_PAYMENT_EXTRACT_QUERY = {
  "from-date-day": "1",
  "from-date-month": "4",
  "from-date-year": "2025",
  "to-date-day": "30",
  "to-date-month": "4",
  "to-date-year": "2025",
};

describe("Reports adaptor", () => {
  let reportsAdaptor: ReportsAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let downloadApplicationsBacklogReportUseCaseStub: StubbedInstance<DownloadApplicationsBacklogReportUseCase>;
  let downloadClaimsBacklogReportUseCaseStub: StubbedInstance<DownloadClaimsBacklogReportUseCase>;
  let paymentExtractValidatorStub: StubbedInstance<PaymentExtractValidator>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    responseStub.status.returns(responseStub);
    requestStub = stubInterface<Request>();
    downloadApplicationsBacklogReportUseCaseStub =
      stubInterface<DownloadApplicationsBacklogReportUseCase>();
    downloadClaimsBacklogReportUseCaseStub =
      stubInterface<DownloadClaimsBacklogReportUseCase>();
    paymentExtractValidatorStub = stubInterface<PaymentExtractValidator>();
    requestStub.session = {
      user: {
        accessToken: "test-access-token",
      },
    } as never;
    reportsAdaptor = new ReportsAdaptor(
      {
        downloadApplicationsBacklogReportUseCase:
          downloadApplicationsBacklogReportUseCaseStub,
        downloadClaimsBacklogReportUseCase:
          downloadClaimsBacklogReportUseCaseStub,
      },
      paymentExtractValidatorStub,
    );
  });

  it("renders reports page", () => {
    reportsAdaptor.renderReportsPage(requestStub, responseStub);

    assert.equal(responseStub.render.callCount, 1);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "reports/index",
      { backUrl: "/" },
    ]);
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

  it("downloads the payment extract as a csv attachment when the date range is valid", () => {
    requestStub.query = VALID_PAYMENT_EXTRACT_QUERY;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({});

    reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

    assert.deepEqual(
      paymentExtractValidatorStub.validatePaymentExtractForm.firstCall.args,
      [VALID_PAYMENT_EXTRACT_QUERY],
    );
    assert.deepEqual(responseStub.setHeader.getCall(0).args, [
      "Content-Type",
      "text/csv",
    ]);
    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      'attachment; filename="payment-extract-2025-04-01-to-2025-04-30.csv"',
    ]);
    assert.deepEqual(responseStub.send.firstCall.args, [
      PAYMENT_EXTRACT_PLACEHOLDER_CSV,
    ]);
    assert.equal(responseStub.render.callCount, 0);
  });

  it("re-renders the reports page with errors when the date range is invalid", () => {
    const query = { ...VALID_PAYMENT_EXTRACT_QUERY, "to-date-day": "" };
    const fromDate = { text: "Start date error" };
    const toDate = { text: "End date error" };
    requestStub.query = query;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({
      fromDate,
      toDate,
    });

    reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

    assert.deepEqual(responseStub.status.firstCall.args, [HTTP_BAD_REQUEST]);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "reports/index",
      {
        backUrl: "/",
        formValues: query,
        errorSummaries: { fromDate, toDate },
        errorList: [
          { text: fromDate.text, href: "#from-date-day" },
          { text: toDate.text, href: "#to-date-day" },
        ],
      },
    ]);
    assert.equal(responseStub.send.callCount, 0);
  });

  it("treats missing and non-string query values as empty date fields", () => {
    requestStub.query = { "from-date-day": ["1", "2"] } as never;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({
      fromDate: { text: "Start date error" },
    });

    reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

    assert.deepEqual(
      paymentExtractValidatorStub.validatePaymentExtractForm.firstCall.args,
      [
        {
          "from-date-day": "",
          "from-date-month": "",
          "from-date-year": "",
          "to-date-day": "",
          "to-date-month": "",
          "to-date-year": "",
        },
      ],
    );
  });
});
