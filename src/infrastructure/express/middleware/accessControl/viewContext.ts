import type { Request, Response, NextFunction } from "express";
import type { CaseworkerRole } from "#src/infrastructure/config/accessControl.js";
import {
  hasPermission as checkHasPermission,
  INTERNAL_CASEWORKER_ROLES,
  PERMISSIONS,
} from "#src/infrastructure/config/accessControl.js";

export function viewContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userRoles: CaseworkerRole[] = req.session.roles ?? [];

  res.locals.userRoles = userRoles;
  res.locals.appRoles = INTERNAL_CASEWORKER_ROLES;
  res.locals.permissions = PERMISSIONS;
  res.locals.hasRole = (role: CaseworkerRole): boolean =>
    userRoles.includes(role);
  res.locals.hasPermission = (permission: unknown): boolean =>
    checkHasPermission(userRoles, permission);

  next();
}
