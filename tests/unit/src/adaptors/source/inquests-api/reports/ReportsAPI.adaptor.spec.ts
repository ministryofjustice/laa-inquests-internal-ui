import sinon from "sinon";
import { assert } from "chai";
import { AxiosError, AxiosHeaders } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { DateRangeReportKey } from "#src/ports/inquests-api/reports/ReportsAPI/ReportsAPI.port.js";
import { ReportsAPIAdaptor } from "#src/adaptors/source/inquests-api/reports/ReportsAPI/ReportsAPI.adaptor.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";
import { logger } from "#src/infrastructure/logging/logger.js";

const buildAxiosError = (status: number, data: unknown = {}): AxiosError => {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };

  return new AxiosError(
    "Request failed",
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    {
      status,
      statusText: "",
      data,
      headers: new AxiosHeaders(),
      config,
    } as AxiosResponse,
  );
};

const axiosGetStub = sinon.stub();

afterEach(() => {
  axiosGetStub.reset();
});

describe("Test Reports API Adaptor", () => {
  it("calls axios.get with correct URL and responseType arraybuffer for applications backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    await adaptor.getApplicationsBacklogReport("access-token-123");

    sinon.assert.calledOnce(axiosGetStub);
    sinon.assert.calledWith(
      axiosGetStub,
      `${baseUrl}/reports/applications/backlog`,
      {
        responseType: "arraybuffer",
        headers: {
          Authorization: "Bearer access-token-123",
        },
      },
    );
  });

  it("returns buffer and content-type for applications backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    const result =
      await adaptor.getApplicationsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  it("defaults to text/csv for applications backlog when content-type header is missing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: {},
    });

    const result =
      await adaptor.getApplicationsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  it("calls axios.get with correct URL and responseType arraybuffer for claims backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    await adaptor.getClaimsBacklogReport("access-token-123");

    sinon.assert.calledOnce(axiosGetStub);
    sinon.assert.calledWith(axiosGetStub, `${baseUrl}/reports/claims/backlog`, {
      responseType: "arraybuffer",
      headers: {
        Authorization: "Bearer access-token-123",
      },
    });
  });

  it("returns buffer and content-type for claims backlog", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: { "content-type": "text/csv" },
    });

    const result = await adaptor.getClaimsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  it("defaults to text/csv for claims backlog when content-type header is missing", async () => {
    const baseUrl = "https://localhost";
    const fakeAxios = { get: axiosGetStub } as any;
    const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

    const mockBuffer = Buffer.from("col1,col2\n1,2");
    axiosGetStub.resolves({
      data: mockBuffer,
      headers: {},
    });

    const result = await adaptor.getClaimsBacklogReport("access-token-123");

    assert.deepEqual(result.data, mockBuffer);
    assert.equal(result.contentType, "text/csv");
  });

  describe("cost estimation and forecasting report", () => {
    it("calls the cost limit forecast endpoint without dates and with an arraybuffer response", async () => {
      const baseUrl = "https://localhost";
      const fakeAxios = { get: axiosGetStub } as any;
      const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

      axiosGetStub.resolves({
        data: Buffer.from("col1,col2\n1,2"),
        headers: { "content-type": "text/csv" },
      });

      await adaptor.getCostEstimationReport("access-token-123");

      sinon.assert.calledOnce(axiosGetStub);
      sinon.assert.calledWith(
        axiosGetStub,
        `${baseUrl}/reports/cost-limit-forecast`,
        {
          responseType: "arraybuffer",
          headers: {
            Authorization: "Bearer access-token-123",
          },
        },
      );
    });

    it("returns buffer, content-type and content-disposition", async () => {
      const baseUrl = "https://localhost";
      const fakeAxios = { get: axiosGetStub } as any;
      const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);
      const mockBuffer = Buffer.from("col1,col2\n1,2");

      axiosGetStub.resolves({
        data: mockBuffer,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=forecast.csv",
        },
      });

      const result = await adaptor.getCostEstimationReport("access-token-123");

      assert.deepEqual(result, {
        data: mockBuffer,
        contentType: "text/csv; charset=utf-8",
        contentDisposition: "attachment; filename=forecast.csv",
      });
    });

    it("defaults content-type and leaves content-disposition undefined when headers are missing", async () => {
      const baseUrl = "https://localhost";
      const fakeAxios = { get: axiosGetStub } as any;
      const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

      axiosGetStub.resolves({ data: Buffer.from("csv"), headers: {} });

      const result = await adaptor.getCostEstimationReport("access-token-123");

      assert.deepEqual(result, {
        data: Buffer.from("csv"),
        contentType: "text/csv",
        contentDisposition: undefined,
      });
    });

    it("throws a sanitised application error when the request fails", async () => {
      const baseUrl = "https://localhost";
      const fakeAxios = { get: axiosGetStub } as any;
      const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);
      const axiosError = buildAxiosError(500);

      axiosGetStub.rejects(axiosError);

      try {
        await adaptor.getCostEstimationReport("access-token-123");
        assert.fail("Expected getCostEstimationReport to throw");
      } catch (error) {
        assert.instanceOf(error, ApplicationError);
        assert.equal(
          (error as ApplicationError).type,
          APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        );
        assert.notStrictEqual((error as Error).cause, axiosError);
      }
    });

    it("throws an authentication error without calling the api when the access token is missing", async () => {
      const baseUrl = "https://localhost";
      const fakeAxios = { get: axiosGetStub } as any;
      const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

      try {
        await adaptor.getCostEstimationReport(undefined);
        assert.fail("Expected getCostEstimationReport to throw");
      } catch (error) {
        assert.instanceOf(error, ApplicationError);
        assert.equal(
          (error as ApplicationError).type,
          APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
        );
      }
      sinon.assert.notCalled(axiosGetStub);
    });
  });

  describe("date range reports", () => {
    const reportRoutes: Array<[DateRangeReportKey, string]> = [
      ["paymentsExtract", "/reports/payment-extract"],
      ["claimsApplicationsProcessing", "/reports/decisions"],
      ["costsForOtherDepartments", "/reports/ogd-costs"],
      ["userAuditTrail", "/reports/audit-trail"],
    ];

    for (const [report, route] of reportRoutes) {
      describe(report, () => {
        it(`calls axios.get on ${route} with the date range as query params`, async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

          axiosGetStub.resolves({
            data: Buffer.from("col1,col2\n1,2"),
            headers: { "content-type": "text/csv" },
          });

          await adaptor.getDateRangeReport(
            report,
            "2026-09-01",
            "2026-09-25",
            "access-token-123",
          );

          sinon.assert.calledOnce(axiosGetStub);
          sinon.assert.calledWith(axiosGetStub, `${baseUrl}${route}`, {
            responseType: "arraybuffer",
            params: { from: "2026-09-01", to: "2026-09-25" },
            headers: {
              Authorization: "Bearer access-token-123",
            },
          });
        });

        it("returns buffer, content-type and content-disposition", async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

          const mockBuffer = Buffer.from("col1,col2\n1,2");
          axiosGetStub.resolves({
            data: mockBuffer,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": "attachment; filename=report.csv",
            },
          });

          const result = await adaptor.getDateRangeReport(
            report,
            "2026-09-01",
            "2026-09-25",
            "access-token-123",
          );

          assert.deepEqual(result, {
            status: "SUCCESS",
            data: mockBuffer,
            contentType: "text/csv; charset=utf-8",
            contentDisposition: "attachment; filename=report.csv",
          });
        });

        it("defaults content-type and leaves content-disposition undefined when headers are missing", async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

          axiosGetStub.resolves({ data: Buffer.from("csv"), headers: {} });

          const result = await adaptor.getDateRangeReport(
            report,
            "2026-09-01",
            "2026-09-25",
            "access-token-123",
          );

          assert.deepEqual(result, {
            status: "SUCCESS",
            data: Buffer.from("csv"),
            contentType: "text/csv",
            contentDisposition: undefined,
          });
        });

        it("throws a sanitised application error when the request fails", async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);
          const axiosError = buildAxiosError(500);

          axiosGetStub.rejects(axiosError);

          try {
            await adaptor.getDateRangeReport(
              report,
              "2026-09-01",
              "2026-09-25",
              "access-token-123",
            );
            assert.fail("Expected getDateRangeReport to throw");
          } catch (error) {
            assert.instanceOf(error, ApplicationError);
            assert.equal(
              (error as ApplicationError).type,
              APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
            );
            assert.notStrictEqual((error as Error).cause, axiosError);
          }
        });

        it("returns a DATE_RANGE_TOO_LONG outcome when the api rejects the date range with a 422", async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

          axiosGetStub.rejects(
            buildAxiosError(
              422,
              Buffer.from(
                JSON.stringify({
                  detail:
                    "Invalid date range: The date range must not exceed 30 days.",
                }),
              ),
            ),
          );

          const result = await adaptor.getDateRangeReport(
            report,
            "2025-01-01",
            "2025-04-30",
            "access-token-123",
          );

          assert.deepEqual(result, { status: "DATE_RANGE_TOO_LONG" });
        });

        it("logs a warning with the report route and throws a sanitised application error when the 422 body is not valid JSON", async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);
          const logWarnStub = sinon.stub(logger, "logWarn");

          axiosGetStub.rejects(
            buildAxiosError(422, Buffer.from("<html>Unprocessable</html>")),
          );

          try {
            await adaptor.getDateRangeReport(
              report,
              "2025-01-01",
              "2025-04-30",
              "access-token-123",
            );
            assert.fail("Expected getDateRangeReport to throw");
          } catch (error) {
            assert.instanceOf(error, ApplicationError);
            sinon.assert.calledOnce(logWarnStub);
            assert.deepInclude(logWarnStub.firstCall.args[0], {
              functionName: "reports_api_adaptor",
              message: "Date range report 422 response body was not valid JSON",
              extraContext: {
                event: "outbound_api_response_unparseable",
                route,
                upstream_status_code: 422,
              },
            });
          } finally {
            logWarnStub.restore();
          }
        });

        it("throws an authentication error without calling the api when the access token is missing", async () => {
          const baseUrl = "https://localhost";
          const fakeAxios = { get: axiosGetStub } as any;
          const adaptor = new ReportsAPIAdaptor(fakeAxios, baseUrl);

          try {
            await adaptor.getDateRangeReport(
              report,
              "2026-09-01",
              "2026-09-25",
              undefined,
            );
            assert.fail("Expected getDateRangeReport to throw");
          } catch (error) {
            assert.instanceOf(error, ApplicationError);
            assert.equal(
              (error as ApplicationError).type,
              APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
            );
          }
          sinon.assert.notCalled(axiosGetStub);
        });
      });
    }
  });
});
