import { strict as assert } from "assert";
import sinon from "sinon";
import { stubInterface } from "ts-sinon";
import type { Request } from "express";
import type { SessionLifetime } from "express-session";
import { logger } from "#src/infrastructure/logging/logger.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";
import { SessionExpiryReason } from "#src/infrastructure/express/session/sessionExpiry.js";
import {
  logAuthLoginFailed,
  logSessionCreated,
  logSessionIdRotated,
  logSessionTerminated,
  toTerminationReason,
} from "#src/infrastructure/express/session/sessionAudit.js";
import {
  AUTH_FAILURE_REASONS,
  SESSION_TERMINATION_REASONS,
} from "#src/infrastructure/locales/constants.js";

const NOW = 1_800_000_000_000;
const ONE_HOUR_MS = 3_600_000;
const IDLE_MS = 1_200_000;
const ABSOLUTE_MS = 43_200_000;
const SESSION_ID = "raw-session-id-123";

describe("sessionAudit", () => {
  let req: Request;
  let logAuditStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;

  const lastExtraContext = (): Record<string, unknown> =>
    (
      logAuditStub.lastCall.args[0] as {
        extraContext: Record<string, unknown>;
      }
    ).extraContext;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: NOW, toFake: ["Date"] });
    logAuditStub = sinon.stub(logger, "logAudit");
    req = stubInterface<Request>();
    (req as unknown as { sessionID: string }).sessionID = SESSION_ID;
    (req as unknown as { path: string }).path = "/auth/logout";
    req.session = { cookie: {} } as unknown as Request["session"];
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe("toTerminationReason", () => {
    it("maps each expiry reason to a termination reason", () => {
      assert.equal(
        toTerminationReason(SessionExpiryReason.Idle),
        SESSION_TERMINATION_REASONS.IDLE_TIMEOUT,
      );
      assert.equal(
        toTerminationReason(SessionExpiryReason.Absolute),
        SESSION_TERMINATION_REASONS.ABSOLUTE_TIMEOUT,
      );
      assert.equal(
        toTerminationReason(SessionExpiryReason.Credential),
        SESSION_TERMINATION_REASONS.CREDENTIAL_EXPIRY,
      );
      assert.equal(
        toTerminationReason(SessionExpiryReason.Invalid),
        SESSION_TERMINATION_REASONS.INVALID_SESSION,
      );
    });
  });

  describe("logSessionIdRotated", () => {
    it("logs the previous and current session hashes", () => {
      logSessionIdRotated(req, "test_fn", "previous-hash", false);

      assert.equal(logAuditStub.callCount, 1);
      assert.deepEqual(lastExtraContext(), {
        event: "session_id_rotated",
        trigger: "login",
        previous_session_hash: "previous-hash",
        session_hash: hashSessionId(SESSION_ID),
        previous_session_authenticated: false,
      });
    });
  });

  describe("logSessionCreated", () => {
    it("logs the session hash and lifetime without user details", () => {
      const lifetime: SessionLifetime = {
        absoluteExpiresAt: NOW + ABSOLUTE_MS,
        credentialExpiresAt: NOW + ONE_HOUR_MS,
        lastActivityAt: NOW,
        idleTimeoutMs: IDLE_MS,
      };
      req.session.lifetime = lifetime;

      logSessionCreated(req, "test_fn", "entra");

      assert.deepEqual(lastExtraContext(), {
        event: "session_created",
        session_hash: hashSessionId(SESSION_ID),
        login_method: "entra",
        idle_timeout_ms: IDLE_MS,
        absolute_timeout_ms: ABSOLUTE_MS,
        credential_expires_in_ms: ONE_HOUR_MS,
      });
    });
  });

  describe("logSessionTerminated", () => {
    it("logs the supplied session hash, reason and route", () => {
      logSessionTerminated(
        req,
        "test_fn",
        "terminated-hash",
        SESSION_TERMINATION_REASONS.USER_LOGOUT,
      );

      assert.deepEqual(lastExtraContext(), {
        event: "session_terminated",
        session_hash: "terminated-hash",
        reason: SESSION_TERMINATION_REASONS.USER_LOGOUT,
        route: "/auth/logout",
      });
    });
  });

  describe("logAuthLoginFailed", () => {
    it("logs the reason without an idp error code when none is given", () => {
      logAuthLoginFailed(
        req,
        "test_fn",
        AUTH_FAILURE_REASONS.TOKEN_ACQUISITION_FAILED,
      );

      assert.deepEqual(lastExtraContext(), {
        event: "auth_login_failed",
        session_hash: hashSessionId(SESSION_ID),
        reason: AUTH_FAILURE_REASONS.TOKEN_ACQUISITION_FAILED,
      });
    });

    it("logs a recognised idp error code", () => {
      logAuthLoginFailed(
        req,
        "test_fn",
        AUTH_FAILURE_REASONS.IDP_ERROR,
        "access_denied",
      );

      assert.equal(lastExtraContext().idp_error_code, "access_denied");
    });

    it("replaces an unrecognised idp error code with other", () => {
      logAuthLoginFailed(
        req,
        "test_fn",
        AUTH_FAILURE_REASONS.IDP_ERROR,
        "user@example.com",
      );

      assert.equal(lastExtraContext().idp_error_code, "other");
    });
  });

  it("never logs the raw session id", () => {
    logSessionIdRotated(req, "test_fn", "previous-hash", true);
    logAuthLoginFailed(req, "test_fn", AUTH_FAILURE_REASONS.MISSING_CODE);

    for (const call of logAuditStub.getCalls()) {
      const { message, extraContext } = call.args[0] as {
        message: string;
        extraContext: Record<string, unknown>;
      };
      assert.equal(
        JSON.stringify({ message, extraContext }).includes(SESSION_ID),
        false,
      );
    }
  });
});
