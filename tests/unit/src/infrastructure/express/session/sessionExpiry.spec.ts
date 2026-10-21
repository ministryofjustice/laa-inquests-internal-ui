import { strict as assert } from "assert";
import type { Session, SessionData, SessionLifetime } from "express-session";
import {
  evaluateSession,
  SessionExpiryReason,
  startSessionLifetime,
} from "#src/infrastructure/express/session/sessionExpiry.js";
import {
  SESSION_ABSOLUTE_TIMEOUT_MS,
  SESSION_EXPIRY_BUFFER_MS,
  SESSION_IDLE_TIMEOUT_MS,
} from "#src/infrastructure/locales/constants.js";

const NOW = 1_800_000_000_000;
const ONE_MINUTE_MS = 60_000;
const ONE_DAY_MS = 86_400_000;

const newSession = (): Session & Partial<SessionData> =>
  ({ cookie: {} }) as unknown as Session & Partial<SessionData>;

const lifetimeFrom = (
  overrides: Partial<SessionLifetime> = {},
): SessionLifetime => ({
  absoluteExpiresAt: NOW + SESSION_ABSOLUTE_TIMEOUT_MS,
  credentialExpiresAt: NOW + ONE_DAY_MS,
  lastActivityAt: NOW,
  idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
  ...overrides,
});

describe("sessionExpiry", () => {
  describe("startSessionLifetime", () => {
    it("records the absolute, credential and activity deadlines", () => {
      const session = newSession();
      const tokenExpiry = new Date(NOW + ONE_DAY_MS);

      startSessionLifetime(session, tokenExpiry, NOW);

      assert.deepEqual(session.lifetime, {
        absoluteExpiresAt: NOW + SESSION_ABSOLUTE_TIMEOUT_MS,
        credentialExpiresAt: NOW + ONE_DAY_MS - SESSION_EXPIRY_BUFFER_MS,
        lastActivityAt: NOW,
        idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
      });
    });

    it("sets the cookie maxAge to the idle timeout when it is the earliest deadline", () => {
      const session = newSession();

      startSessionLifetime(session, new Date(NOW + ONE_DAY_MS), NOW);

      assert.equal(session.cookie.maxAge, SESSION_IDLE_TIMEOUT_MS);
    });

    it("sets the cookie maxAge to the credential expiry when it is the earliest deadline", () => {
      const session = newSession();
      const tokenExpiry = new Date(
        NOW + SESSION_EXPIRY_BUFFER_MS + ONE_MINUTE_MS,
      );

      startSessionLifetime(session, tokenExpiry, NOW);

      assert.equal(session.cookie.maxAge, ONE_MINUTE_MS);
    });

    it("clamps the cookie maxAge to zero when the token has already expired", () => {
      const session = newSession();

      startSessionLifetime(session, new Date(NOW - ONE_MINUTE_MS), NOW);

      assert.equal(session.cookie.maxAge, 0);
    });

    it("throws and leaves the session untouched when the token expiry is missing", () => {
      const session = newSession();

      assert.throws(
        () => startSessionLifetime(session, undefined, NOW),
        /access token expiry/i,
      );
      assert.equal(session.lifetime, undefined);
      assert.equal(session.cookie.maxAge, undefined);
    });

    it("throws when the token expiry is an invalid date", () => {
      const session = newSession();

      assert.throws(
        () => startSessionLifetime(session, new Date("not-a-date"), NOW),
        /access token expiry/i,
      );
      assert.equal(session.lifetime, undefined);
    });
  });

  describe("evaluateSession", () => {
    it("is valid within all deadlines and returns time to the next idle deadline", () => {
      const result = evaluateSession(lifetimeFrom(), NOW + ONE_MINUTE_MS);

      assert.deepEqual(result, {
        valid: true,
        remainingMs: SESSION_IDLE_TIMEOUT_MS,
      });
    });

    it("expires as idle once the idle timeout has passed since last activity", () => {
      const result = evaluateSession(
        lifetimeFrom(),
        NOW + SESSION_IDLE_TIMEOUT_MS,
      );

      assert.deepEqual(result, {
        valid: false,
        reason: SessionExpiryReason.Idle,
      });
    });

    it("expires at the absolute deadline despite continuous activity", () => {
      const now = NOW + SESSION_ABSOLUTE_TIMEOUT_MS;
      const result = evaluateSession(
        lifetimeFrom({ lastActivityAt: now - ONE_MINUTE_MS }),
        now,
      );

      assert.deepEqual(result, {
        valid: false,
        reason: SessionExpiryReason.Absolute,
      });
    });

    it("never returns remaining time beyond the absolute deadline", () => {
      const now = NOW + SESSION_ABSOLUTE_TIMEOUT_MS - ONE_MINUTE_MS;
      const result = evaluateSession(
        lifetimeFrom({ lastActivityAt: now - ONE_MINUTE_MS }),
        now,
      );

      assert.deepEqual(result, { valid: true, remainingMs: ONE_MINUTE_MS });
    });

    it("expires when the credential expires before the other deadlines", () => {
      const result = evaluateSession(
        lifetimeFrom({ credentialExpiresAt: NOW + ONE_MINUTE_MS }),
        NOW + ONE_MINUTE_MS,
      );

      assert.deepEqual(result, {
        valid: false,
        reason: SessionExpiryReason.Credential,
      });
    });
  });
});
