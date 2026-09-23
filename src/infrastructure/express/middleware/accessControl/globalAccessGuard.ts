import type { Request, Response, NextFunction } from "express";
import {
  findRoutePolicy,
  hasAllowedRole,
  isPublicPath,
  type CaseworkerRole,
} from "#src/infrastructure/config/accessControl.js";
import { HTTP_FORBIDDEN } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";

type DenyReason = "insufficient_role";

/**
 * Central, default-deny page-level authorisation.
 *
 * Decision order:
 * 1. Allow explicitly public / infrastructure paths.
 * 2. Defer unauthenticated requests so `requireAuth` owns the login redirect.
 * 3. Deny authenticated requests to routes missing from the central policy.
 * 4. Allow when any session role satisfies the policy; otherwise deny.
 *
 * Denied requests render the shared error page with a 403 and emit a single
 * structured warning carrying only non-sensitive metadata.
 */
export function globalAccessGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isPublicPath(req.path)) {
    next();
    return;
  }

  const userId = req.session.user?.userId;
  if (userId === undefined || userId === "") {
    next();
    return;
  }

  const policy = findRoutePolicy(req.path);
  if (policy === undefined) {
    next();
    // TODO: Deny unconfigured routes in the future once route policies have been configured
    return;
  }

  const userRoles: CaseworkerRole[] = req.session.roles ?? [];
  if (hasAllowedRole(userRoles, policy)) {
    next();
    return;
  }

  denyAccess(req, res, "insufficient_role");
}

function denyAccess(req: Request, res: Response, reason: DenyReason): void {
  logger.logWarn({
    functionName: "global_access_guard",
    message: "Access denied",
    request: req,
    extraContext: {
      event: "access_denied",
      reason,
      route: req.path,
    },
  });

  res.status(HTTP_FORBIDDEN).render("main/error-unauthorised");
}
