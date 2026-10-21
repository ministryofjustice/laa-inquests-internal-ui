import type { Session, SessionData, SessionLifetime } from "express-session";
import {
  SESSION_ABSOLUTE_TIMEOUT_MS,
  SESSION_EXPIRY_BUFFER_MS,
  SESSION_IDLE_TIMEOUT_MS,
} from "#src/infrastructure/locales/constants.js";

const MIN_REMAINING_MS = 0;

export const SessionExpiryReason = {
  Idle: "idle",
  Absolute: "absolute",
  Credential: "credential",
  Invalid: "invalid",
} as const;
export type SessionExpiryReason =
  (typeof SessionExpiryReason)[keyof typeof SessionExpiryReason];

export type SessionEvaluation =
  | { readonly valid: true; readonly remainingMs: number }
  | { readonly valid: false; readonly reason: SessionExpiryReason };

export interface SessionTimeouts {
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
}

const DEFAULT_TIMEOUTS: SessionTimeouts = {
  idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
  absoluteTimeoutMs: SESSION_ABSOLUTE_TIMEOUT_MS,
};

const remainingMs = (lifetime: SessionLifetime, now: number): number =>
  Math.max(
    MIN_REMAINING_MS,
    Math.min(
      lifetime.lastActivityAt + lifetime.idleTimeoutMs,
      lifetime.absoluteExpiresAt,
      lifetime.credentialExpiresAt,
    ) - now,
  );

export const startSessionLifetime = (
  session: Session & Partial<SessionData>,
  credentialExpiresOn: Date | undefined,
  now: number,
  timeouts: SessionTimeouts = DEFAULT_TIMEOUTS,
): void => {
  if (
    !(credentialExpiresOn instanceof Date) ||
    Number.isNaN(credentialExpiresOn.getTime())
  ) {
    throw new Error(
      "Cannot start session: missing or invalid access token expiry",
    );
  }
  const lifetime: SessionLifetime = {
    absoluteExpiresAt: now + timeouts.absoluteTimeoutMs,
    credentialExpiresAt:
      credentialExpiresOn.getTime() - SESSION_EXPIRY_BUFFER_MS,
    lastActivityAt: now,
    idleTimeoutMs: timeouts.idleTimeoutMs,
  };
  session.lifetime = lifetime;
  session.cookie.maxAge = remainingMs(lifetime, now);
};

export const evaluateSession = (
  lifetime: SessionLifetime,
  now: number,
): SessionEvaluation => {
  if (now >= lifetime.absoluteExpiresAt) {
    return { valid: false, reason: SessionExpiryReason.Absolute };
  }
  if (now >= lifetime.credentialExpiresAt) {
    return { valid: false, reason: SessionExpiryReason.Credential };
  }
  if (now - lifetime.lastActivityAt >= lifetime.idleTimeoutMs) {
    return { valid: false, reason: SessionExpiryReason.Idle };
  }
  // Remaining time assumes this request counts as activity.
  return {
    valid: true,
    remainingMs: remainingMs({ ...lifetime, lastActivityAt: now }, now),
  };
};
