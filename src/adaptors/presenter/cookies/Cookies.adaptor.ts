import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";

interface CookiesPreferencesForm {
  returnTo?: string;
}

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
    res.render("main/cookies", { backUrl: req.query.returnTo });
  }

  saveCookiesPreferences(req: Request, res: Response): void {
    logger.logInfo({
      functionName: "save_cookies_preferences",
      message: "Saving cookies preferences",
      request: req,
      extraContext: {
        event: "cookies_preferences_saved",
      },
    });
    // Implement the logic to save cookies preferences here
    const form = req.body as CookiesPreferencesForm;
    res.render("main/cookies", {
      success: true,
      returnTo: form.returnTo ?? "/",
    });
  }
}
