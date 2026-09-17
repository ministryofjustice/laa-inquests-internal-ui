import type { Request, Response, NextFunction } from "express";
import type { CaseworkerRole } from "#src/infrastructure/config/accessControl.js";
import { INTERNAL_CASEWORKER_ROLES } from "#src/infrastructure/config/accessControl.js";

// Exposes the current caseworker's roles to Nunjucks templates for conditional rendering.
export function viewContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userRoles: CaseworkerRole[] = req.session.roles ?? [];

  res.locals.userRoles = userRoles;
  res.locals.appRoles = INTERNAL_CASEWORKER_ROLES;
  res.locals.hasRole = (role: CaseworkerRole): boolean =>
    userRoles.includes(role);

  next();
}
