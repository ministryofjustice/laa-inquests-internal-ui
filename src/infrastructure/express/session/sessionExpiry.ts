import type { Session } from "express-session";
import { SESSION_EXPIRY_BUFFER_MS } from "#src/infrastructure/locales/constants.js";

const MIN_SESSION_MAX_AGE_MS = 0;

export const computeSessionMaxAge = (
  expiresOn: Date,
  now: number,
  bufferMs: number = SESSION_EXPIRY_BUFFER_MS,
): number =>
  Math.max(MIN_SESSION_MAX_AGE_MS, expiresOn.getTime() - now - bufferMs);

export const applySessionExpiry = (
  session: Session,
  expiresOn: Date | undefined,
): void => {
  if (expiresOn === undefined) {
    throw new Error("Cannot set session expiry: missing access token expiry");
  }
  session.cookie.maxAge = computeSessionMaxAge(expiresOn, Date.now());
};
