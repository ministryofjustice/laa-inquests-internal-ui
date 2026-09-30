import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response } from "express";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import type { DownloadPaymentExtractReportUseCase } from "#src/use-cases/reports/DownloadPaymentExtractReport.useCase.js";
import type { PaymentExtractValidator } from "#src/adaptors/presenter/reports/PaymentExtract/PaymentExtract.validator.js";
import { HTTP_BAD_REQUEST } from "#src/infrastructure/express/constants.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

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
  let downloadPaymentExtractReportUseCaseStub: StubbedInstance<DownloadPaymentExtractReportUseCase>;
  let paymentExtractValidatorStub: StubbedInstance<PaymentExtractValidator>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    responseStub.status.returns(responseStub);
    requestStub = stubInterface<Request>();
    downloadApplicationsBacklogReportUseCaseStub =
      stubInterface<DownloadApplicationsBacklogReportUseCase>();
    downloadClaimsBacklogReportUseCaseStub =
      stubInterface<DownloadClaimsBacklogReportUseCase>();
    downloadPaymentExtractReportUseCaseStub =
      stubInterface<DownloadPaymentExtractReportUseCase>();
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
        downloadPaymentExtractReportUseCase:
          downloadPaymentExtractReportUseCaseStub,
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

  it("downloads the payment extract from the api when the date range is valid", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    requestStub.query = VALID_PAYMENT_EXTRACT_QUERY;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({});
    downloadPaymentExtractReportUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: mockBuffer,
      contentType: "text/csv; charset=utf-8",
      contentDisposition:
        "attachment; filename=payment_extract_2025-04-01_2025-04-30.csv",
    });

    await reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

    assert.deepEqual(
      paymentExtractValidatorStub.validatePaymentExtractForm.firstCall.args,
      [VALID_PAYMENT_EXTRACT_QUERY],
    );
    assert.deepEqual(
      downloadPaymentExtractReportUseCaseStub.execute.firstCall.args,
      ["2025-04-01", "2025-04-30", "test-access-token"],
    );
    assert.deepEqual(responseStub.setHeader.getCall(0).args, [
      "Content-Type",
      "text/csv; charset=utf-8",
    ]);
    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      "attachment; filename=payment_extract_2025-04-01_2025-04-30.csv",
    ]);
    assert.deepEqual(responseStub.send.firstCall.args, [mockBuffer]);
    assert.equal(responseStub.render.callCount, 0);
  });

  it("uses a fallback filename when the api does not provide a content disposition", async () => {
    requestStub.query = VALID_PAYMENT_EXTRACT_QUERY;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({});
    downloadPaymentExtractReportUseCaseStub.execute.resolves({
      status: "SUCCESS",
      data: Buffer.from("csv"),
      contentType: "text/csv",
      contentDisposition: undefined,
    });

    await reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      'attachment; filename="payment-extract-2025-04-01-to-2025-04-30.csv"',
    ]);
  });

  it("propagates payment extract failures without writing a response", async () => {
    const error = new Error("API error");
    requestStub.query = VALID_PAYMENT_EXTRACT_QUERY;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({});
    downloadPaymentExtractReportUseCaseStub.execute.rejects(error);

    await assert.rejects(
      reportsAdaptor.downloadPaymentExtract(requestStub, responseStub),
      (thrown: unknown) => thrown === error,
    );

    assert.equal(responseStub.setHeader.callCount, 0);
    assert.equal(responseStub.send.callCount, 0);
  });

  it("re-renders the reports page with a date range error when the api rejects the range as too long", async () => {
    requestStub.query = VALID_PAYMENT_EXTRACT_QUERY;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({});
    downloadPaymentExtractReportUseCaseStub.execute.resolves({
      status: "DATE_RANGE_TOO_LONG",
    });
    const toDate = {
      text: en.pages.reports.paymentExtract.validationErrors.dateRangeTooLong,
    };

    await reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

    assert.deepEqual(responseStub.status.firstCall.args, [HTTP_BAD_REQUEST]);
    assert.deepEqual(responseStub.render.firstCall.args, [
      "reports/index",
      {
        backUrl: "/",
        formValues: VALID_PAYMENT_EXTRACT_QUERY,
        errorSummaries: { toDate },
        errorList: [{ text: toDate.text, href: "#to-date-day" }],
      },
    ]);
    assert.equal(responseStub.setHeader.callCount, 0);
    assert.equal(responseStub.send.callCount, 0);
  });

  it("re-renders the reports page with errors when the date range is invalid", async () => {
    const query = { ...VALID_PAYMENT_EXTRACT_QUERY, "to-date-day": "" };
    const fromDate = { text: "Start date error" };
    const toDate = { text: "End date error" };
    requestStub.query = query;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({
      fromDate,
      toDate,
    });

    await reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

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
    assert.equal(downloadPaymentExtractReportUseCaseStub.execute.callCount, 0);
  });

  it("treats missing and non-string query values as empty date fields", async () => {
    requestStub.query = { "from-date-day": ["1", "2"] } as never;
    paymentExtractValidatorStub.validatePaymentExtractForm.returns({
      fromDate: { text: "Start date error" },
    });

    await reportsAdaptor.downloadPaymentExtract(requestStub, responseStub);

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
