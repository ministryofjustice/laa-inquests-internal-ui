import { strict as assert } from "assert";
import sinon from "sinon";
import type { NextFunction, Request, Response } from "express";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import {
  handleApiAuthErrors,
  handleApplicationNotFoundError,
  handleReportDownloadError,
  handleServerErrors,
} from "#src/infrastructure/express/middleware/errors/errors.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";
import { SESSION_TERMINATION_REASONS } from "#src/infrastructure/locales/constants.js";
import { initializeI18nextSync } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";
import {
  APPLICATION_ERROR_TYPES,
  ApplicationError,
  type ApplicationErrorType,
} from "#src/use-cases/common/applicationError.js";

const buildAuthError = (
  failure: "UNAUTHENTICATED" | "FORBIDDEN",
): ApplicationError =>
  new ApplicationError(
    failure === "UNAUTHENTICATED"
      ? APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED
      : APPLICATION_ERROR_TYPES.FORBIDDEN,
    "get_application",
    false,
  );

describe("error middleware", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;

  before(() => {
    initializeI18nextSync();
  });

  beforeEach(() => {
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("handleServerErrors", () => {
    it("logs and renders the fallback 500 page", () => {
      const err = new Error("plain error");
      const logSpy = sinon.spy(logger, "logError");

      handleServerErrors(
        err,
        req as unknown as Request,
        res as unknown as Response,
        next as unknown as NextFunction,
      );

      assert.equal(logSpy.callCount, 1);
      assert.equal(res.status.callCount, 1);
      assert.equal(res.status.firstCall.args[0], 500);
      assert.equal(res.status.calledBefore(res.render), true);
      assert.equal(res.render.callCount, 1);
      assert.deepEqual(res.render.firstCall.args, [
        "main/error",
        {
          status: 500,
          error: "Internal Server Error",
        },
      ]);
      assert.equal(next.callCount, 0);
    });

    it("logs safe application error metadata", () => {
      const err = new ApplicationError(
        APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        "get_certificate",
        true,
      );
      const logSpy = sinon.spy(logger, "logError");
      Object.defineProperty(req, "path", {
        value: "/applications/123/certificate",
      });
      Object.defineProperty(req, "method", { value: "GET" });

      handleServerErrors(
        err,
        req as unknown as Request,
        res as unknown as Response,
        next as unknown as NextFunction,
      );

      assert.deepEqual(logSpy.firstCall.args[0].extraContext, {
        event: "http_request_failed",
        error_type: APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        operation: "get_certificate",
        retryable: true,
        route: "/applications/123/certificate",
        method: "GET",
        status_code: 500,
      });
    });
  });

  describe("handleApplicationNotFoundError", () => {
    it("renders page if error is application not found", () => {
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.NOT_FOUND,
        "get_application",
        false,
      );

      handleApplicationNotFoundError(error, req, res, next);

      assert.equal(res.status.callCount, 1);
      assert.equal(res.status.firstCall.args[0], 404);
      assert.equal(res.render.callCount, 1);
      const args = res.render.firstCall.args;
      assert.equal(args[0], "application/not-found");
    });

    it("logs error on application not found", () => {
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.NOT_FOUND,
        "get_application",
        false,
      );
      const logSpy = sinon.spy(logger, "logError");

      handleApplicationNotFoundError(error, req, res, next);

      assert.equal(logSpy.callCount, 1);
    });

    it("does not call next on application not found", () => {
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.NOT_FOUND,
        "get_application",
        false,
      );

      handleApplicationNotFoundError(error, req, res, next);

      assert.equal(next.callCount, 0);
    });

    it("calls next and does not render page on non-application not found error", () => {
      const error = new ApplicationError(
        APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
        "get_application",
        false,
      );

      handleApplicationNotFoundError(error, req, res, next);

      assert.equal(res.render.callCount, 0);
      assert.equal(next.callCount, 1);
    });
  });

  describe("handleReportDownloadError", () => {
    const reportError = (
      type: ApplicationErrorType = APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
    ): ApplicationError => new ApplicationError(type, "report_download", true);

    const callMiddleware = (err: unknown): void => {
      handleReportDownloadError(
        err,
        req as unknown as Request,
        res as unknown as Response,
        next as unknown as NextFunction,
      );
    };

    const requestTo = (path: string, query: Request["query"] = {}): void => {
      Object.defineProperty(req, "path", { value: path });
      Object.defineProperty(req, "method", { value: "GET" });
      req.query = query;
    };

    const renderedBackUrl = (): string =>
      (res.render.firstCall.args[1] as unknown as { backUrl: string }).backUrl;

    beforeEach(() => {
      res.status.returns(res as unknown as Response);
    });

    for (const type of [
      APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
      APPLICATION_ERROR_TYPES.UPSTREAM_REJECTED,
      APPLICATION_ERROR_TYPES.INVALID_UPSTREAM_RESPONSE,
    ]) {
      it(`renders the report failure page with a 500 for ${type}`, () => {
        requestTo("/reports/payments-extract/download");

        callMiddleware(reportError(type));

        assert.equal(res.status.firstCall.args[0], 500);
        assert.equal(res.status.calledBefore(res.render), true);
        assert.equal(res.render.firstCall.args[0], "reports/download-error");
        assert.equal(next.callCount, 0);
      });
    }

    it("names a date range report after its lowercase heading and links back with the entered dates", () => {
      requestTo("/reports/user-audit-trail/download", {
        "start-date-day": "1",
        "start-date-month": "4",
        "start-date-year": "2025",
        "end-date-day": "30",
        "end-date-month": "4",
        "end-date-year": "2025",
        unexpected: "<script>",
      });

      callMiddleware(reportError());

      assert.deepEqual(res.render.firstCall.args[1], {
        isDateRange: true,
        reportName: "user audit trail",
        backUrl:
          "/reports/user-audit-trail?start-date-day=1&start-date-month=4&start-date-year=2025&end-date-day=30&end-date-month=4&end-date-year=2025",
      });
    });

    it("links back to the report page without a query when no dates were sent", () => {
      requestTo("/reports/payments-extract/download");

      callMiddleware(reportError());

      assert.equal(renderedBackUrl(), "/reports/payments-extract");
    });

    it("ignores non-string date values", () => {
      requestTo("/reports/payments-extract/download", {
        "start-date-day": ["1", "2"],
      });

      callMiddleware(reportError());

      assert.equal(renderedBackUrl(), "/reports/payments-extract");
    });

    for (const [path, reportName] of [
      ["/reports/applications/backlog", "applications workflow backlog"],
      ["/reports/claims/backlog", "claims workflow backlog"],
      [
        "/reports/cost-estimation-and-forecasting",
        "cost estimation and forecasting",
      ],
    ]) {
      it(`renders the direct download variant for ${path}`, () => {
        requestTo(path);

        callMiddleware(reportError());

        assert.deepEqual(res.render.firstCall.args, [
          "reports/download-error",
          { isDateRange: false, reportName, backUrl: "/reports" },
        ]);
      });
    }

    it("logs the failure once with safe context and no query string", () => {
      const logSpy = sinon.spy(logger, "logError");
      requestTo("/reports/claims/backlog", { secret: "value" });

      callMiddleware(reportError());

      assert.equal(logSpy.callCount, 1);
      const { extraContext } = logSpy.firstCall.args[0] as {
        extraContext: Record<string, unknown>;
      };
      assert.deepEqual(extraContext, {
        event: "http_request_failed",
        route: "/reports/claims/backlog",
        method: "GET",
        status_code: 500,
        error_type: "UPSTREAM_UNAVAILABLE",
        operation: "report_download",
        retryable: true,
      });
    });

    it("renders the failure page whatever operation the outbound adapter reported", () => {
      requestTo("/reports/claims/backlog");

      callMiddleware(
        new ApplicationError(
          APPLICATION_ERROR_TYPES.UPSTREAM_UNAVAILABLE,
          "/reports/claims/backlog",
          true,
        ),
      );

      assert.equal(res.render.firstCall.args[0], "reports/download-error");
      assert.equal(next.callCount, 0);
    });

    for (const type of [
      APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
      APPLICATION_ERROR_TYPES.FORBIDDEN,
      APPLICATION_ERROR_TYPES.NOT_FOUND,
    ]) {
      it(`passes ${type} to the next handler`, () => {
        requestTo("/reports/claims/backlog");

        callMiddleware(reportError(type));

        assert.equal(res.render.callCount, 0);
        assert.equal(next.callCount, 1);
      });
    }

    it("passes errors that are not application errors to the next handler", () => {
      requestTo("/reports/claims/backlog");
      const err = new Error("plain error");

      callMiddleware(err);

      assert.equal(res.render.callCount, 0);
      assert.deepEqual(next.firstCall.args, [err]);
    });

    it("passes the error on when the path is not a report download", () => {
      requestTo("/applications/search");

      callMiddleware(reportError());

      assert.equal(res.render.callCount, 0);
      assert.equal(next.callCount, 1);
    });
  });

  describe("handleApiAuthErrors", () => {
    let destroy: sinon.SinonStub;

    const callMiddleware = (err: unknown): void => {
      handleApiAuthErrors(
        err,
        req as unknown as Request,
        res as unknown as Response,
        next as unknown as NextFunction,
      );
    };

    beforeEach(() => {
      destroy = sinon.stub().callsArg(0);
      req.query = {};
      req.session = { destroy } as never;
      (req as unknown as { sessionID: string }).sessionID = "api-session-id";
      res.status.returns(res as unknown as Response);
    });

    it("logs a credential_rejected session termination when unauthenticated", () => {
      const logAuditStub = sinon.stub(logger, "logAudit");

      callMiddleware(buildAuthError("UNAUTHENTICATED"));

      assert.equal(logAuditStub.callCount, 1);
      const { extraContext } = logAuditStub.firstCall.args[0] as {
        extraContext: Record<string, unknown>;
      };
      assert.equal(extraContext.event, "session_terminated");
      assert.equal(extraContext.session_hash, hashSessionId("api-session-id"));
      assert.equal(
        extraContext.reason,
        SESSION_TERMINATION_REASONS.CREDENTIAL_REJECTED,
      );
    });

    it("does not log a session termination when forbidden", () => {
      const logAuditStub = sinon.stub(logger, "logAudit");

      callMiddleware(buildAuthError("FORBIDDEN"));

      assert.equal(logAuditStub.callCount, 0);
    });

    it("signs the user out and redirects to the login route when unauthenticated", () => {
      callMiddleware(buildAuthError("UNAUTHENTICATED"));

      assert.equal(destroy.callCount, 1);
      assert.equal(res.redirect.callCount, 1);
      assert.equal(
        res.redirect.firstCall.args[0],
        "/auth/login?sessionExpired=true",
      );
      assert.equal(next.callCount, 0);
    });

    it("signs the user out when an application error requires authentication", () => {
      callMiddleware(
        new ApplicationError(
          APPLICATION_ERROR_TYPES.AUTHENTICATION_REQUIRED,
          "get_certificate",
          false,
        ),
      );

      assert.equal(destroy.callCount, 1);
      assert.equal(res.redirect.callCount, 1);
      assert.equal(
        res.redirect.firstCall.args[0],
        "/auth/login?sessionExpired=true",
      );
      assert.equal(next.callCount, 0);
    });

    it("logs a single warning when unauthenticated", () => {
      const logSpy = sinon.spy(logger, "logWarn");

      callMiddleware(buildAuthError("UNAUTHENTICATED"));

      assert.equal(logSpy.callCount, 1);
      assert.equal(
        logSpy.firstCall.args[0].extraContext?.event,
        "auth_session_expired",
      );
    });

    it("redirects even when destroying the session fails", () => {
      destroy.callsArgWith(0, new Error("redis unavailable"));

      callMiddleware(buildAuthError("UNAUTHENTICATED"));

      assert.equal(res.redirect.callCount, 1);
    });

    it("does not redirect a request that has already been redirected once", () => {
      req.query = { sessionExpired: "true" };

      callMiddleware(buildAuthError("UNAUTHENTICATED"));

      assert.equal(res.redirect.callCount, 0);
      assert.equal(destroy.callCount, 0);
      assert.equal(next.callCount, 1);
    });

    it("renders the forbidden page when forbidden", () => {
      callMiddleware(buildAuthError("FORBIDDEN"));

      assert.equal(res.status.callCount, 1);
      assert.equal(res.status.firstCall.args[0], 403);
      assert.deepEqual(res.render.firstCall.args, ["main/error-unauthorised"]);
      assert.equal(res.redirect.callCount, 0);
      assert.equal(destroy.callCount, 0);
      assert.equal(next.callCount, 0);
    });

    it("renders the forbidden page for a forbidden application error", () => {
      callMiddleware(
        new ApplicationError(
          APPLICATION_ERROR_TYPES.FORBIDDEN,
          "get_certificate",
          false,
        ),
      );

      assert.equal(res.status.callCount, 1);
      assert.equal(res.status.firstCall.args[0], 403);
      assert.deepEqual(res.render.firstCall.args, ["main/error-unauthorised"]);
      assert.equal(res.redirect.callCount, 0);
      assert.equal(destroy.callCount, 0);
      assert.equal(next.callCount, 0);
    });

    it("logs a single warning when forbidden", () => {
      const logSpy = sinon.spy(logger, "logWarn");

      callMiddleware(buildAuthError("FORBIDDEN"));

      assert.equal(logSpy.callCount, 1);
      assert.equal(
        logSpy.firstCall.args[0].extraContext?.event,
        "api_forbidden",
      );
    });

    it("passes on errors that are not upstream auth failures", () => {
      const err = new Error("boom");

      callMiddleware(err);

      assert.equal(next.callCount, 1);
      assert.equal(next.firstCall.args[0], err);
      assert.equal(res.redirect.callCount, 0);
      assert.equal(res.render.callCount, 0);
    });
  });
});
