import express from "express";
import type { Request, Response } from "express";

const MOCK_OAUTH_PORT = 4001;

export function startMockOAuthServer(): void {
  const app = express();

  app.get("/authorize", (req: Request, res: Response): void => {
    const { redirect_uri } = req.query as { redirect_uri: string };
    const params = new URLSearchParams({ code: "test-user-id" });
    res.redirect(`${redirect_uri}?${params.toString()}`);
  });

  app.listen(MOCK_OAUTH_PORT, () => {
    console.log(`Mock OAuth server started on port ${MOCK_OAUTH_PORT}`);
  });
}
