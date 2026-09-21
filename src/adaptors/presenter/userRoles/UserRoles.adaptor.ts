import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";

export class UserRolesAdaptor {
  renderUserRolesPage(req: Request, res: Response): void {
    logger.logInfo({
      functionName: "render_user_roles_page",
      message: "User roles page requested",
      request: req,
      extraContext: {
        event: "user_roles_page_requested",
      },
    });

    res.render("non-production/user-roles");
  }
}
