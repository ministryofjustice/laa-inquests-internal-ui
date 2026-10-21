import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { setCookies } from "#src/infrastructure/express/middleware/cookies/cookies.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";

interface CookiesPreferencesForm {
  returnTo?: string;
  acceptCookies?: string;
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
    res.render("main/cookies", { returnTo: req.query.returnTo });
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
    const { acceptCookies, returnTo = "/" } =
      req.body as CookiesPreferencesForm;

    let success = true;
    try {
      setCookies(res, acceptCookies === "yes");
    } catch (err) {
      success = false;
      logger.logError({
        functionName: "set_cookies",
        message: "Setting cookies failed",
        request: req,
        extraContext: {
          event: "set_cookies_failed",
          method: req.method,
          status_code: HTTP_INTERNAL_SERVER_ERROR,
        },
      });
    }

    res.render("main/cookies", { success, returnTo });
  }
}
