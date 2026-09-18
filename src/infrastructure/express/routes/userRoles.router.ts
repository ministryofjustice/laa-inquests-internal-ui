import type { NextFunction, Request, Response, Router } from "express";
import type { UserRolesAdaptor } from "#src/adaptors/presenter/userRoles/UserRoles.adaptor.js";

export function createUserRolesRouter(
  userRolesRouter: Router,
  userRolesAdaptor: UserRolesAdaptor,
): Router {
  userRolesRouter.get(
    "/",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        userRolesAdaptor.renderUserRolesPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return userRolesRouter;
}
