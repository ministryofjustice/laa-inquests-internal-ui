import type { NextFunction, Request, Response, Router } from "express";
import type { AccessibilityStatementAdaptor } from "#src/adaptors/presenter/accessibilityStatement/AccessibilityStatement.adaptor.js";

export function createAccessibilityStatementRouter(
  accessibilityStatementRouter: Router,
  accessibilityStatementAdaptor: AccessibilityStatementAdaptor,
): Router {
  accessibilityStatementRouter.get(
    "/",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        accessibilityStatementAdaptor.renderPage(res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return accessibilityStatementRouter;
}
