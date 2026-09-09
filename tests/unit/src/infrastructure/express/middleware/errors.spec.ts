import { strict as assert } from "assert";
import sinon from "sinon";
import type { NextFunction, Request, Response } from "express";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import {
  handleApiAuthErrors,
  handleServerErrors,
} from "#src/infrastructure/express/middleware/errors/errors.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { initializeI18nextSync } from "#src/infrastructure/express/middleware/nunjucks/i18nLoader.js";
import {
  APPLICATION_ERROR_KINDS,
  ApplicationError,
} from "#src/use-cases/common/applicationError.js";

const buildAuthError = (
  failure: "UNAUTHENTICATED" | "FORBIDDEN",
): ApplicationError =>
  new ApplicationError(
    failure === "UNAUTHENTICATED"
      ? APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED
      : APPLICATION_ERROR_KINDS.FORBIDDEN,
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
        APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
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
        error_kind: APPLICATION_ERROR_KINDS.UPSTREAM_UNAVAILABLE,
        operation: "get_certificate",
        retryable: true,
        route: "/applications/123/certificate",
        method: "GET",
        status_code: 500,
      });
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
      res.status.returns(res as unknown as Response);
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
          APPLICATION_ERROR_KINDS.AUTHENTICATION_REQUIRED,
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
      assert.deepEqual(res.render.firstCall.args, [
        "main/error",
        {
          status: 403,
          error: "Forbidden",
        },
      ]);
      assert.equal(res.redirect.callCount, 0);
      assert.equal(destroy.callCount, 0);
      assert.equal(next.callCount, 0);
    });

    it("renders the forbidden page for a forbidden application error", () => {
      callMiddleware(
        new ApplicationError(
          APPLICATION_ERROR_KINDS.FORBIDDEN,
          "get_certificate",
          false,
        ),
      );

      assert.equal(res.status.callCount, 1);
      assert.equal(res.status.firstCall.args[0], 403);
      assert.deepEqual(res.render.firstCall.args, [
        "main/error",
        {
          status: 403,
          error: "Forbidden",
        },
      ]);
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
