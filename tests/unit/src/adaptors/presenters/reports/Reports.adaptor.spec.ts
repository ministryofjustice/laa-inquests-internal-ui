import { strict as assert } from "assert";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import sinon from "sinon";
import type { Request, Response } from "express";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import type { DownloadApplicationsBacklogReportUseCase } from "#src/use-cases/reports/DownloadApplicationsBacklogReport.useCase.js";
import type { DownloadClaimsBacklogReportUseCase } from "#src/use-cases/reports/DownloadClaimsBacklogReport.useCase.js";
import type { DownloadCostEstimationReportUseCase } from "#src/use-cases/reports/DownloadCostEstimationReport.useCase.js";
import type { DownloadDateRangeReportUseCase } from "#src/use-cases/reports/DownloadDateRangeReport.useCase.js";
import type { DateRangeReportValidator } from "#src/adaptors/presenter/reports/DateRangeReport/DateRangeReport.validator.js";
import {
  DATE_RANGE_REPORTS,
  findDateRangeReport,
} from "#src/adaptors/presenter/reports/reportDefinitions.js";
import {
  HTTP_BAD_REQUEST,
  HTTP_TOO_MANY_REQUESTS,
} from "#src/infrastructure/express/errorConstants.js";
import config from "#src/infrastructure/config/config.js";

const VALID_QUERY = {
  "start-date-day": "1",
  "start-date-month": "4",
  "start-date-year": "2025",
  "end-date-day": "30",
  "end-date-month": "4",
  "end-date-year": "2025",
};

const PAYMENTS_EXTRACT = findDateRangeReport("payments-extract")!;
const USER_AUDIT_TRAIL = findDateRangeReport("user-audit-trail")!;

const viewModelFor = (report: typeof PAYMENTS_EXTRACT) => ({
  backUrl: "/reports",
  reportKey: report.key,
  reportSlug: report.slug,
  maxDays: report.maxDays,
});

describe("Reports adaptor", () => {
  let reportsAdaptor: ReportsAdaptor;
  let responseStub: StubbedInstance<Response>;
  let requestStub: StubbedInstance<Request>;
  let downloadApplicationsBacklogReportUseCaseStub: StubbedInstance<DownloadApplicationsBacklogReportUseCase>;
  let downloadClaimsBacklogReportUseCaseStub: StubbedInstance<DownloadClaimsBacklogReportUseCase>;
  let downloadCostEstimationReportUseCaseStub: StubbedInstance<DownloadCostEstimationReportUseCase>;
  let downloadDateRangeReportUseCaseStub: StubbedInstance<DownloadDateRangeReportUseCase>;
  let dateRangeReportValidatorStub: StubbedInstance<DateRangeReportValidator>;

  beforeEach(() => {
    responseStub = stubInterface<Response>();
    responseStub.status.returns(responseStub);
    responseStub.locals = {};
    requestStub = stubInterface<Request>();
    downloadApplicationsBacklogReportUseCaseStub =
      stubInterface<DownloadApplicationsBacklogReportUseCase>();
    downloadClaimsBacklogReportUseCaseStub =
      stubInterface<DownloadClaimsBacklogReportUseCase>();
    downloadCostEstimationReportUseCaseStub =
      stubInterface<DownloadCostEstimationReportUseCase>();
    downloadDateRangeReportUseCaseStub =
      stubInterface<DownloadDateRangeReportUseCase>();
    dateRangeReportValidatorStub = stubInterface<DateRangeReportValidator>();
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
        downloadCostEstimationReportUseCase:
          downloadCostEstimationReportUseCaseStub,
        downloadDateRangeReportUseCase: downloadDateRangeReportUseCaseStub,
      },
      dateRangeReportValidatorStub,
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
    const clock = sinon.useFakeTimers({
      now: Date.UTC(2026, 9, 30, 10, 10, 10),
      toFake: ["Date"],
    });

    try {
      const mockBuffer = Buffer.from("col1,col2\n1,2");
      downloadApplicationsBacklogReportUseCaseStub.execute.resolves({
        data: mockBuffer,
        contentType: "text/csv",
      });

      await reportsAdaptor.downloadApplicationsBacklog(
        requestStub,
        responseStub,
      );

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
        'attachment; filename="2026-10-30-101010 - Report - IDDS Applications Backlog - OFFICIAL-SENSITIVE - LAA Use Only.csv"',
      ]);
      assert.equal(responseStub.send.callCount, 1);
      assert.deepEqual(responseStub.send.firstCall.args, [mockBuffer]);
    } finally {
      clock.restore();
    }
  });

  it("uses London summer time in the applications backlog filename", async () => {
    const clock = sinon.useFakeTimers({
      now: Date.UTC(2026, 6, 30, 10, 10, 10),
      toFake: ["Date"],
    });

    try {
      downloadApplicationsBacklogReportUseCaseStub.execute.resolves({
        data: Buffer.from("col1,col2\n1,2"),
        contentType: "text/csv",
      });

      await reportsAdaptor.downloadApplicationsBacklog(
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.setHeader.getCall(1).args, [
        "Content-Disposition",
        'attachment; filename="2026-07-30-111010 - Report - IDDS Applications Backlog - OFFICIAL-SENSITIVE - LAA Use Only.csv"',
      ]);
    } finally {
      clock.restore();
    }
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
    const clock = sinon.useFakeTimers({
      now: Date.UTC(2026, 9, 30, 10, 10, 10),
      toFake: ["Date"],
    });

    try {
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
        'attachment; filename="2026-10-30-101010 - Report - IDDS Claims Backlog - OFFICIAL-SENSITIVE - LAA Use Only.csv"',
      ]);
      assert.equal(responseStub.send.callCount, 1);
      assert.deepEqual(responseStub.send.firstCall.args, [mockBuffer]);
    } finally {
      clock.restore();
    }
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

  it("downloads the cost estimation report with the api content disposition", async () => {
    const mockBuffer = Buffer.from("col1,col2\n1,2");
    downloadCostEstimationReportUseCaseStub.execute.resolves({
      data: mockBuffer,
      contentType: "text/csv; charset=utf-8",
      contentDisposition: "attachment; filename=forecast.csv",
    });

    await reportsAdaptor.downloadCostEstimation(requestStub, responseStub);

    assert.deepEqual(
      downloadCostEstimationReportUseCaseStub.execute.firstCall.args,
      ["test-access-token"],
    );
    assert.equal(responseStub.setHeader.callCount, 2);
    assert.deepEqual(responseStub.setHeader.getCall(0).args, [
      "Content-Type",
      "text/csv; charset=utf-8",
    ]);
    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      "attachment; filename=forecast.csv",
    ]);
    assert.deepEqual(responseStub.send.firstCall.args, [mockBuffer]);
  });

  it("uses a fallback filename for the cost estimation report when the api does not provide one", async () => {
    downloadCostEstimationReportUseCaseStub.execute.resolves({
      data: Buffer.from("csv"),
      contentType: "text/csv",
      contentDisposition: undefined,
    });

    await reportsAdaptor.downloadCostEstimation(requestStub, responseStub);

    assert.deepEqual(responseStub.setHeader.getCall(1).args, [
      "Content-Disposition",
      'attachment; filename="cost-estimation-and-forecasting.csv"',
    ]);
  });

  it("propagates cost estimation report failures without writing a response", async () => {
    const error = new Error("API error");
    downloadCostEstimationReportUseCaseStub.execute.rejects(error);

    await assert.rejects(
      reportsAdaptor.downloadCostEstimation(requestStub, responseStub),
      (thrown: unknown) => thrown === error,
    );

    assert.equal(responseStub.setHeader.callCount, 0);
    assert.equal(responseStub.send.callCount, 0);
  });

  describe("date range report pages", () => {
    for (const report of DATE_RANGE_REPORTS) {
      it(`renders the ${report.key} report page without errors`, () => {
        requestStub.query = {};

        reportsAdaptor.renderDateRangeReportPage(
          report,
          requestStub,
          responseStub,
        );

        assert.equal(responseStub.status.callCount, 0);
        assert.deepEqual(responseStub.render.firstCall.args, [
          "reports/date-range-report",
          {
            ...viewModelFor(report),
            formValues: {
              "start-date-day": "",
              "start-date-month": "",
              "start-date-year": "",
              "end-date-day": "",
              "end-date-month": "",
              "end-date-year": "",
            },
          },
        ]);
      });
    }

    it("prefills the form with the dates in the query", () => {
      requestStub.query = VALID_QUERY;

      reportsAdaptor.renderDateRangeReportPage(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.render.firstCall.args, [
        "reports/date-range-report",
        { ...viewModelFor(PAYMENTS_EXTRACT), formValues: VALID_QUERY },
      ]);
    });
  });

  describe("downloading a date range report", () => {
    it("downloads the report from the api when the date range is valid", async () => {
      const mockBuffer = Buffer.from("col1,col2\n1,2");
      requestStub.query = VALID_QUERY;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
      downloadDateRangeReportUseCaseStub.execute.resolves({
        status: "SUCCESS",
        data: mockBuffer,
        contentType: "text/csv; charset=utf-8",
        contentDisposition:
          "attachment; filename=payment_extract_2025-04-01_2025-04-30.csv",
      });

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(
        dateRangeReportValidatorStub.validateDateRangeReportForm.firstCall.args,
        [VALID_QUERY, PAYMENTS_EXTRACT.maxDays],
      );
      assert.deepEqual(
        downloadDateRangeReportUseCaseStub.execute.firstCall.args,
        ["paymentsExtract", "2025-04-01", "2025-04-30", "test-access-token"],
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

    it("validates and downloads using the limit and key of the requested report", async () => {
      requestStub.query = VALID_QUERY;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
      downloadDateRangeReportUseCaseStub.execute.resolves({
        status: "SUCCESS",
        data: Buffer.from("csv"),
        contentType: "text/csv",
        contentDisposition: undefined,
      });

      await reportsAdaptor.downloadDateRangeReport(
        USER_AUDIT_TRAIL,
        requestStub,
        responseStub,
      );

      assert.equal(
        dateRangeReportValidatorStub.validateDateRangeReportForm.firstCall
          .args[1],
        USER_AUDIT_TRAIL.maxDays,
      );
      assert.equal(
        downloadDateRangeReportUseCaseStub.execute.firstCall.args[0],
        "userAuditTrail",
      );
    });

    it("zero pads single digit days and months in the dates sent to the api", async () => {
      requestStub.query = {
        ...VALID_QUERY,
        "start-date-day": " 5 ",
        "start-date-month": "3",
        "end-date-day": "9",
        "end-date-month": "3",
      };
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
      downloadDateRangeReportUseCaseStub.execute.resolves({
        status: "SUCCESS",
        data: Buffer.from("csv"),
        contentType: "text/csv",
        contentDisposition: undefined,
      });

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(
        downloadDateRangeReportUseCaseStub.execute.firstCall.args.slice(1, 3),
        ["2025-03-05", "2025-03-09"],
      );
    });

    it("uses a fallback filename when the api does not provide a content disposition", async () => {
      requestStub.query = VALID_QUERY;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
      downloadDateRangeReportUseCaseStub.execute.resolves({
        status: "SUCCESS",
        data: Buffer.from("csv"),
        contentType: "text/csv",
        contentDisposition: undefined,
      });

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.setHeader.getCall(1).args, [
        "Content-Disposition",
        'attachment; filename="payments-extract-2025-04-01-to-2025-04-30.csv"',
      ]);
    });

    it("propagates report failures without writing a response", async () => {
      const error = new Error("API error");
      requestStub.query = VALID_QUERY;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
      downloadDateRangeReportUseCaseStub.execute.rejects(error);

      await assert.rejects(
        reportsAdaptor.downloadDateRangeReport(
          PAYMENTS_EXTRACT,
          requestStub,
          responseStub,
        ),
        (thrown: unknown) => thrown === error,
      );

      assert.equal(responseStub.setHeader.callCount, 0);
      assert.equal(responseStub.send.callCount, 0);
    });

    it("re-renders the report page with a date range error when the api rejects the range as too long", async () => {
      requestStub.query = VALID_QUERY;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
      downloadDateRangeReportUseCaseStub.execute.resolves({
        status: "DATE_RANGE_TOO_LONG",
      });
      const text = `Date range must be between 1 and ${PAYMENTS_EXTRACT.maxDays} days`;
      const fields = ["day", "month", "year"];

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.status.firstCall.args, [HTTP_BAD_REQUEST]);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "reports/date-range-report",
        {
          ...viewModelFor(PAYMENTS_EXTRACT),
          formValues: VALID_QUERY,
          errorSummaries: {
            startDate: { text, fields },
            endDate: { text, fields, inSummary: false },
          },
          errorList: [{ text, href: "#start-date-day" }],
        },
      ]);
      assert.equal(responseStub.setHeader.callCount, 0);
      assert.equal(responseStub.send.callCount, 0);
    });

    it("re-renders the report page with errors when the date range is invalid", async () => {
      const query = { ...VALID_QUERY, "end-date-day": "" };
      const startDate = { text: "Start date error", fields: ["day" as const] };
      const endDate = { text: "End date error", fields: ["month" as const] };
      requestStub.query = query;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({
        startDate,
        endDate,
      });

      await reportsAdaptor.downloadDateRangeReport(
        USER_AUDIT_TRAIL,
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.status.firstCall.args, [HTTP_BAD_REQUEST]);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "reports/date-range-report",
        {
          ...viewModelFor(USER_AUDIT_TRAIL),
          formValues: query,
          errorSummaries: { startDate, endDate },
          errorList: [
            { text: startDate.text, href: "#start-date-day" },
            { text: endDate.text, href: "#end-date-month" },
          ],
        },
      ]);
      assert.equal(responseStub.send.callCount, 0);
      assert.equal(downloadDateRangeReportUseCaseStub.execute.callCount, 0);
    });

    it("treats missing and non-string query values as empty date fields", async () => {
      requestStub.query = { "start-date-day": ["1", "2"] } as never;
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({
        startDate: { text: "Start date error", fields: ["day"] },
      });

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(
        dateRangeReportValidatorStub.validateDateRangeReportForm.firstCall
          .args[0],
        {
          "start-date-day": "",
          "start-date-month": "",
          "start-date-year": "",
          "end-date-day": "",
          "end-date-month": "",
          "end-date-year": "",
        },
      );
    });

    it("renders the report page with the rate limit message instead of downloading when the rate limit is exceeded", async () => {
      requestStub.query = VALID_QUERY;
      responseStub.locals = { rateLimit: true };
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.status.firstCall.args, [
        HTTP_TOO_MANY_REQUESTS,
      ]);
      assert.deepEqual(responseStub.render.firstCall.args, [
        "reports/date-range-report",
        {
          ...viewModelFor(PAYMENTS_EXTRACT),
          formValues: VALID_QUERY,
          shouldShowRateLimitText: true,
          config,
        },
      ]);
      assert.equal(downloadDateRangeReportUseCaseStub.execute.callCount, 0);
      assert.equal(responseStub.send.callCount, 0);
    });

    it("shows validation errors rather than the rate limit message when the form is invalid", async () => {
      const startDate = { text: "Start date error", fields: ["day" as const] };
      requestStub.query = VALID_QUERY;
      responseStub.locals = { rateLimit: true };
      dateRangeReportValidatorStub.validateDateRangeReportForm.returns({
        startDate,
      });

      await reportsAdaptor.downloadDateRangeReport(
        PAYMENTS_EXTRACT,
        requestStub,
        responseStub,
      );

      assert.deepEqual(responseStub.status.firstCall.args, [HTTP_BAD_REQUEST]);
    });

    describe("download complete cookie", () => {
      const TOKEN = "3f2b8c1e-4d5a-4b6c-9d7e-8f9a0b1c2d3e";

      const downloadWith = async (
        query: Record<string, unknown>,
      ): Promise<void> => {
        requestStub.query = query as never;
        dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
        downloadDateRangeReportUseCaseStub.execute.resolves({
          status: "SUCCESS",
          data: Buffer.from("a,b"),
          contentType: "text/csv; charset=utf-8",
          contentDisposition: undefined,
        });
        await reportsAdaptor.downloadDateRangeReport(
          PAYMENTS_EXTRACT,
          requestStub,
          responseStub,
        );
      };

      it("sets the cookie with the submitted token when the download succeeds", async () => {
        await downloadWith({ ...VALID_QUERY, "download-token": TOKEN });

        assert.equal(responseStub.cookie.callCount, 1);
        const [name, value, options] = responseStub.cookie.firstCall
          .args as unknown as [string, string, Record<string, unknown>];
        assert.equal(name, "reportDownloadToken");
        assert.equal(value, TOKEN);
        assert.equal(options.httpOnly, false);
        assert.equal(options.sameSite, "lax");
        assert.equal(options.path, "/");
        assert.equal(responseStub.send.callCount, 1);
      });

      it("does not set the cookie when no token is submitted", async () => {
        await downloadWith(VALID_QUERY);

        assert.equal(responseStub.cookie.callCount, 0);
        assert.equal(responseStub.send.callCount, 1);
      });

      it("does not set the cookie when the token is malformed", async () => {
        await downloadWith({ ...VALID_QUERY, "download-token": "a;b=c\r\n" });

        assert.equal(responseStub.cookie.callCount, 0);
        assert.equal(responseStub.send.callCount, 1);
      });

      it("does not set the cookie when the form is invalid", async () => {
        requestStub.query = { ...VALID_QUERY, "download-token": TOKEN };
        dateRangeReportValidatorStub.validateDateRangeReportForm.returns({
          startDate: { text: "Start date error", fields: ["day"] },
        });

        await reportsAdaptor.downloadDateRangeReport(
          PAYMENTS_EXTRACT,
          requestStub,
          responseStub,
        );

        assert.equal(responseStub.cookie.callCount, 0);
      });

      it("does not set the cookie when the api rejects the range as too long", async () => {
        requestStub.query = { ...VALID_QUERY, "download-token": TOKEN };
        dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});
        downloadDateRangeReportUseCaseStub.execute.resolves({
          status: "DATE_RANGE_TOO_LONG",
        });

        await reportsAdaptor.downloadDateRangeReport(
          PAYMENTS_EXTRACT,
          requestStub,
          responseStub,
        );

        assert.equal(responseStub.cookie.callCount, 0);
      });

      it("does not set the cookie when the rate limit is exceeded", async () => {
        requestStub.query = { ...VALID_QUERY, "download-token": TOKEN };
        responseStub.locals = { rateLimit: true };
        dateRangeReportValidatorStub.validateDateRangeReportForm.returns({});

        await reportsAdaptor.downloadDateRangeReport(
          PAYMENTS_EXTRACT,
          requestStub,
          responseStub,
        );

        assert.equal(responseStub.cookie.callCount, 0);
      });
    });
  });
});
