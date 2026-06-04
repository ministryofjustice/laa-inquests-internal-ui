import type { Router, Request, Response } from "express";
import type { Session } from "express-session";

export default function createTestRouter(router: Router): Router {
  const SUCCESSFUL_REQUEST = 200;

    router.get(
        "/test/auth-session",
        (req: Request & { session: Session & { userId?: string } }, res: Response): void => {
            req.session.userId = "test-user-id";
            req.session.save(() => {
                res.status(SUCCESSFUL_REQUEST).send("Session was seeded successfully.");
            });
        },
  );

  return router;
}

