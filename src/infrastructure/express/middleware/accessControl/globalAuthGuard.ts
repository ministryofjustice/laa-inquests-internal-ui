import type { Request, Response, NextFunction } from "express";
import { isPublicPath } from "#src/infrastructure/config/accessControl.js";
import { logger } from "#src/infrastructure/logging/logger.js";

/**
 * Global authentication guard that enforces login for all protected routes.
 *
 * This middleware runs BEFORE route matching to prevent unauthenticated users
 * from reaching 404 handlers, which would leak information about which routes exist.
 *
 * Decision order:
 * 1. Allow explicitly public / infrastructure paths (health, status, auth, etc.)
 * 2. If unauthenticated and path is protected, redirect to login
 * 3. If authenticated, allow (detailed RBAC enforcement happens in globalAccessGuard)
 *
 * This prevents information disclosure via 404 pages.
 */
export function globalAuthGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isPublicPath(req.path)) {
    next();
    return;
  }

  const userId = req.session.user?.userId;
  if (userId !== undefined && userId !== "") {
    next();
    return;
  }

  logger.logWarn({
    functionName: "global_auth_guard",
    message: "Unauthenticated request to protected route, redirecting to login",
    request: req,
    extraContext: {
      event: "unauthenticated_protected_route_access",
      route: req.path,
      method: req.method,
    },
  });

  res.redirect("/auth/login");
}
