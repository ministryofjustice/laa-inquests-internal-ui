import type { Request, Response, NextFunction } from "express";
import type { SessionLifetime } from "express-session";
import { isPublicPath } from "#src/infrastructure/config/accessControl.js";
import config from "#src/infrastructure/config/config.js";
import {
  evaluateSession,
  SessionExpiryReason,
} from "#src/infrastructure/express/session/sessionExpiry.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";
import {
  logSessionTerminated,
  toTerminationReason,
} from "#src/infrastructure/express/session/sessionAudit.js";

export function sessionLifetimeGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = req.session.user?.userId;
  if (isPublicPath(req.path) || userId === undefined || userId === "") {
    next();
    return;
  }

  const lifetime: SessionLifetime | undefined = req.session.lifetime;
  if (lifetime === undefined) {
    expireSession(req, res, next, SessionExpiryReason.Invalid);
    return;
  }

  const now = Date.now();
  const result = evaluateSession(lifetime, now);
  if (!result.valid) {
    expireSession(req, res, next, result.reason);
    return;
  }

  req.session.lifetime = { ...lifetime, lastActivityAt: now };
  const { remainingMs } = result;
  // connect-redis derives the Redis TTL from the cookie expiry.
  req.session.cookie.maxAge = remainingMs;
  next();
}

function expireSession(
  req: Request,
  res: Response,
  next: NextFunction,
  reason: SessionExpiryReason,
): void {
  logSessionTerminated(
    req,
    "session_lifetime_guard",
    hashSessionId(req.sessionID),
    toTerminationReason(reason),
  );

  req.session.destroy((err: unknown) => {
    res.clearCookie(config.session.name);
    if (err !== undefined && err !== null) {
      next(err);
      return;
    }
    res.redirect("/auth/login");
  });
}
