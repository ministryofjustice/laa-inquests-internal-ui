import type { Router, Request, Response } from "express";
import type { Session, SessionData } from "express-session";

export default function createTestRouter(router: Router): Router {
  const SUCCESSFUL_REQUEST = 200;

  router.get(
    "/test/auth-session",
    (
      req: Request & { session: Session & Partial<SessionData> },
      res: Response,
    ): void => {
      req.session.user = { userId: "test-user-id", userName: "Test User" };
      req.session.save(() => {
        res.status(SUCCESSFUL_REQUEST).send("Session was seeded successfully.");
      });
    },
  );

  return router;
}
