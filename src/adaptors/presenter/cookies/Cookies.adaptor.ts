import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";

export class CookiesAdaptor {
  renderCookiesPage(req: Request, res: Response): void {
    logger.logInfo({
      functionName: "render_cookies_page",
      message: "Cookies page requested",
      request: req,
      extraContext: {
        event: "cookies_page_requested",
      },
    });
    res.render("main/cookies", { backUrl: "/" });
  }
}
