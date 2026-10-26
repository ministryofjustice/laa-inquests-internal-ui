import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface, type StubbedInstance } from "ts-sinon";
import type { Request, Response, NextFunction } from "express";
import type { SessionLifetime } from "express-session";
import { sessionLifetimeGuard } from "#src/infrastructure/express/middleware/auth/sessionLifetimeGuard.js";
import config from "#src/infrastructure/config/config.js";
import {
  SESSION_ABSOLUTE_TIMEOUT_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_TERMINATION_REASONS,
} from "#src/infrastructure/locales/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";

const NOW = 1_800_000_000_000;
const ONE_MINUTE_MS = 60_000;
const ONE_DAY_MS = 86_400_000;
const SESSION_ID = "guard-session-id";

describe("sessionLifetimeGuard", () => {
  let req: StubbedInstance<Request>;
  let res: StubbedInstance<Response>;
  let next: sinon.SinonStub;
  let destroy: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;

  const setPath = (path: string): void => {
    (req as unknown as { path: string }).path = path;
  };

  const lifetime = (): SessionLifetime => ({
    absoluteExpiresAt: NOW + SESSION_ABSOLUTE_TIMEOUT_MS,
    credentialExpiresAt: NOW + ONE_DAY_MS,
    lastActivityAt: NOW,
    idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: NOW, toFake: ["Date"] });
    req = stubInterface<Request>();
    res = stubInterface<Response>();
    next = sinon.stub();
    destroy = sinon.stub().callsArg(0);
    setPath("/");
    (req as unknown as { sessionID: string }).sessionID = SESSION_ID;
    req.session = {
      cookie: {},
      destroy,
      user: { userId: "user-1" },
      lifetime: lifetime(),
    } as any;
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  const expectExpired = (): void => {
    assert.equal(destroy.callCount, 1);
    assert.deepEqual(res.clearCookie.firstCall.args, [config.session.name]);
    assert.equal(res.redirect.firstCall.args[0], "/auth/login");
    assert.equal(next.callCount, 0);
  };

  it("calls next without checks for public paths", () => {
    setPath("/auth/login");
    req.session.lifetime = undefined;

    sessionLifetimeGuard(req, res, next as NextFunction);

    assert.equal(next.callCount, 1);
    assert.equal(destroy.callCount, 0);
  });

  it("calls next without checks when there is no signed-in user", () => {
    req.session.user = undefined as any;
    req.session.lifetime = undefined;

    sessionLifetimeGuard(req, res, next as NextFunction);

    assert.equal(next.callCount, 1);
    assert.equal(destroy.callCount, 0);
  });

  it("records activity and caps the cookie at the idle timeout when the session is valid", () => {
    clock.tick(ONE_MINUTE_MS);

    sessionLifetimeGuard(req, res, next as NextFunction);

    assert.equal(next.callCount, 1);
    assert.equal(req.session.lifetime?.lastActivityAt, NOW + ONE_MINUTE_MS);
    assert.equal(
      req.session.lifetime?.absoluteExpiresAt,
      NOW + SESSION_ABSOLUTE_TIMEOUT_MS,
    );
    assert.equal(req.session.cookie.maxAge, SESSION_IDLE_TIMEOUT_MS);
  });

  it("expires the session after the idle timeout", () => {
    clock.tick(SESSION_IDLE_TIMEOUT_MS);

    sessionLifetimeGuard(req, res, next as NextFunction);

    expectExpired();
  });

  it("expires the session at the absolute deadline despite continuous activity", () => {
    const activityInterval = SESSION_IDLE_TIMEOUT_MS - ONE_MINUTE_MS;
    while (Date.now() + activityInterval < NOW + SESSION_ABSOLUTE_TIMEOUT_MS) {
      clock.tick(activityInterval);
      sessionLifetimeGuard(req, res, next as NextFunction);
    }
    assert.equal(destroy.callCount, 0);
    next.resetHistory();

    clock.tick(activityInterval);
    sessionLifetimeGuard(req, res, next as NextFunction);

    expectExpired();
  });

  it("expires the session when the credential expires first", () => {
    req.session.lifetime = {
      ...lifetime(),
      credentialExpiresAt: NOW + ONE_MINUTE_MS,
    };
    clock.tick(ONE_MINUTE_MS);

    sessionLifetimeGuard(req, res, next as NextFunction);

    expectExpired();
  });

  it("expires a signed-in session that has no lifetime", () => {
    req.session.lifetime = undefined;

    sessionLifetimeGuard(req, res, next as NextFunction);

    expectExpired();
  });

  it("passes the error to next when destroying the session fails", () => {
    const destroyError = new Error("store failure");
    destroy.callsArgWith(0, destroyError);
    clock.tick(SESSION_IDLE_TIMEOUT_MS);

    sessionLifetimeGuard(req, res, next as NextFunction);

    assert.equal(next.firstCall.args[0], destroyError);
    assert.equal(res.clearCookie.callCount, 1);
    assert.equal(res.redirect.callCount, 0);
  });

  describe("audit logging", () => {
    let logAuditStub: sinon.SinonStub;

    const terminationEvent = (): Record<string, unknown> =>
      (
        logAuditStub.firstCall.args[0] as {
          extraContext: Record<string, unknown>;
        }
      ).extraContext;

    beforeEach(() => {
      logAuditStub = sinon.stub(logger, "logAudit");
    });

    it("logs an idle_timeout termination with the session hash", () => {
      clock.tick(SESSION_IDLE_TIMEOUT_MS);

      sessionLifetimeGuard(req, res, next as NextFunction);

      assert.equal(logAuditStub.callCount, 1);
      assert.deepEqual(terminationEvent(), {
        event: "session_terminated",
        session_hash: hashSessionId(SESSION_ID),
        reason: SESSION_TERMINATION_REASONS.IDLE_TIMEOUT,
        route: "/",
      });
    });

    it("logs a credential_expiry termination when the credential expires first", () => {
      req.session.lifetime = {
        ...lifetime(),
        credentialExpiresAt: NOW + ONE_MINUTE_MS,
      };
      clock.tick(ONE_MINUTE_MS);

      sessionLifetimeGuard(req, res, next as NextFunction);

      assert.equal(
        terminationEvent().reason,
        SESSION_TERMINATION_REASONS.CREDENTIAL_EXPIRY,
      );
    });

    it("logs an invalid_session termination for a signed-in session without a lifetime", () => {
      req.session.lifetime = undefined;

      sessionLifetimeGuard(req, res, next as NextFunction);

      assert.equal(
        terminationEvent().reason,
        SESSION_TERMINATION_REASONS.INVALID_SESSION,
      );
    });

    it("does not log a termination for a valid session", () => {
      clock.tick(ONE_MINUTE_MS);

      sessionLifetimeGuard(req, res, next as NextFunction);

      assert.equal(logAuditStub.callCount, 0);
    });
  });
});
