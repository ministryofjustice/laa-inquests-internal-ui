import type { Request } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";
import { SessionExpiryReason } from "#src/infrastructure/express/session/sessionExpiry.js";
import {
  ALLOWED_IDP_ERROR_CODES,
  type AUTH_FAILURE_REASONS,
  SESSION_TERMINATION_REASONS,
  UNRECOGNISED_IDP_ERROR_CODE,
} from "#src/infrastructure/locales/constants.js";

export type SessionTerminationReason =
  (typeof SESSION_TERMINATION_REASONS)[keyof typeof SESSION_TERMINATION_REASONS];

export type AuthFailureReason =
  (typeof AUTH_FAILURE_REASONS)[keyof typeof AUTH_FAILURE_REASONS];

export type LoginMethod = "entra" | "test";

export const toTerminationReason = (
  reason: SessionExpiryReason,
): SessionTerminationReason => {
  if (reason === SessionExpiryReason.Idle) {
    return SESSION_TERMINATION_REASONS.IDLE_TIMEOUT;
  }
  if (reason === SessionExpiryReason.Absolute) {
    return SESSION_TERMINATION_REASONS.ABSOLUTE_TIMEOUT;
  }
  if (reason === SessionExpiryReason.Credential) {
    return SESSION_TERMINATION_REASONS.CREDENTIAL_EXPIRY;
  }
  return SESSION_TERMINATION_REASONS.INVALID_SESSION;
};

export const logSessionIdRotated = (
  req: Request,
  functionName: string,
  previousSessionHash: string,
  previousSessionAuthenticated: boolean,
): void => {
  logger.logAudit({
    functionName,
    message: "Session ID rotated",
    request: req,
    extraContext: {
      event: "session_id_rotated",
      trigger: "login",
      previous_session_hash: previousSessionHash,
      session_hash: hashSessionId(req.sessionID),
      previous_session_authenticated: previousSessionAuthenticated,
    },
  });
};

export const logSessionCreated = (
  req: Request,
  functionName: string,
  loginMethod: LoginMethod,
): void => {
  const { session } = req;
  const { lifetime } = session;
  const now = Date.now();
  logger.logAudit({
    functionName,
    message: "Session created",
    request: req,
    extraContext: {
      event: "session_created",
      session_hash: hashSessionId(req.sessionID),
      login_method: loginMethod,
      idle_timeout_ms: lifetime?.idleTimeoutMs,
      absolute_timeout_ms:
        lifetime === undefined ? undefined : lifetime.absoluteExpiresAt - now,
      credential_expires_in_ms:
        lifetime === undefined ? undefined : lifetime.credentialExpiresAt - now,
    },
  });
};

// Callers hash before destroy() because the destroyed session is no longer on the request.
export const logSessionTerminated = (
  req: Request,
  functionName: string,
  sessionHash: string,
  reason: SessionTerminationReason,
): void => {
  logger.logAudit({
    functionName,
    message: "Session terminated",
    request: req,
    extraContext: {
      event: "session_terminated",
      session_hash: sessionHash,
      reason,
      route: req.path,
    },
  });
};

const toIdpErrorCode = (idpError: string): string => {
  if (ALLOWED_IDP_ERROR_CODES.includes(idpError)) {
    return idpError;
  }
  return UNRECOGNISED_IDP_ERROR_CODE;
};

export const logAuthLoginFailed = (
  req: Request,
  functionName: string,
  reason: AuthFailureReason,
  idpError?: unknown,
): void => {
  logger.logAudit({
    functionName,
    message: "Authentication failed",
    request: req,
    extraContext: {
      event: "auth_login_failed",
      session_hash: hashSessionId(req.sessionID),
      reason,
      ...(typeof idpError === "string"
        ? { idp_error_code: toIdpErrorCode(idpError) }
        : {}),
    },
  });
};
