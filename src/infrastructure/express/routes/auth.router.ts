import type { NextFunction, Request, Response, Router } from "express";
import type { AuthAdaptor } from "#src/adaptors/presenter/auth/Auth.adaptor.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";
import { applySessionExpiry } from "#src/infrastructure/express/session/sessionExpiry.js";

const MILLISECONDS_IN_A_SECOND = 1000;

export function createAuthRouter(
  authRouter: Router,
  authAdaptor: AuthAdaptor,
): Router {
  authRouter.get(
    "/login",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        logger.logInfo({
          functionName: "auth_route",
          message: "Login requested",
          request: req,
          extraContext: {
            event: "auth_login_requested",
          },
        });
        await authAdaptor.login(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  authRouter.get(
    "/callback",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        logger.logInfo({
          functionName: "auth_route",
          message: "Auth callback received",
          request: req,
          extraContext: {
            event: "auth_callback_received",
            has_code:
              typeof req.query.code === "string" && req.query.code !== "",
          },
        });
        await authAdaptor.callback(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  authRouter.get(
    "/logout",
    (req: Request, res: Response, next: NextFunction): void => {
      logger.logInfo({
        functionName: "auth_route",
        message: "Logout requested",
        request: req,
        extraContext: {
          event: "auth_logout_requested",
        },
      });
      authAdaptor.logout(req, res, next);
    },
  );

  // Test-only login endpoint that seeds a session without hitting Entra ID.
  // Never mounted outside the test environment.
  if (process.env.NODE_ENV === "test") {
    authRouter.get("/test-login", (req: Request, res: Response): void => {
      logger.logInfo({
        functionName: "auth_route",
        message: "Test login requested",
        request: req,
        extraContext: {
          event: "auth_test_login_requested",
        },
      });
      req.session.user = {
        userId: "test-caseworker",
        userName: "[MOJUSER] - [INTSILAS] Internal E2E",
        accessToken: "test-access-token",
      };

      // Optional expiry to exercise session-expiry behaviour in E2E tests.
      const tokenExpirySeconds = Number(req.query.tokenExpirySeconds);
      if (!Number.isNaN(tokenExpirySeconds)) {
        applySessionExpiry(
          req.session,
          new Date(Date.now() + tokenExpirySeconds * MILLISECONDS_IN_A_SECOND),
        );
      }

      res.redirect("/");
    });
  }

  return authRouter;
}
