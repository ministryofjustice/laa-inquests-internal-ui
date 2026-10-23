import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { setCookies } from "#src/infrastructure/express/middleware/cookies/cookies.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";

interface CookiesPreferencesForm {
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
    const saved = req.query.saved === "true";
    const success = saved && req.cookies.cookies_policy !== undefined;
    if (saved && !success) {
      logger.logError({
        functionName: "set_cookies",
        message: "Setting cookies failed, dropped by browser",
        request: req,
        extraContext: {
          event: "set_cookies_failed",
          method: req.method,
          status_code: HTTP_INTERNAL_SERVER_ERROR,
        },
      });
    }

    res.render("main/cookies", {
      returnTo: req.session.returnTo ?? "/",
      success,
    });
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
    const { acceptCookies } = req.body as CookiesPreferencesForm;

    let saved = true;
    try {
      setCookies(req, res, acceptCookies === "yes");
      logger.logInfo({
        functionName: "set_cookies",
        message: "Cookies set successfully",
        request: req,
        extraContext: {
          event: "set_cookies_success",
          method: req.method,
        },
      });
    } catch (err) {
      saved = false;
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

    res.redirect(`/cookies?saved=${saved}`);
  }

  saveBannerPreferences(req: Request, res: Response): void {
    const form = req.body as CookiesPreferencesForm;
    req.session.cookieBannerState = "failed";
    res.locals.hasTrackingConsent = false;
    res.locals.showCookieBanner = true;

    setCookies(req, res, form.acceptCookies === "yes");

    req.session.cookieBannerState =
      form.acceptCookies === "yes" ? "accepted" : "rejected";

    logger.logInfo({
      functionName: "save_banner_preferences",
      message: "Cookie banner preference storage requested",
      request: req,
      extraContext: {
        event: "cookies_preferences_save_requested",
      },
    });
    res.redirect(this.#returnUrl(req.session.returnTo));
  }

  hideBannerConfirmation(req: Request, res: Response): void {
    req.session.cookieBannerState = "closed";
    res.redirect(this.#returnUrl(req.session.returnTo));
  }

  #returnUrl(value: unknown): string {
    if (
      typeof value === "string" &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\") &&
      !/\p{Control}/v.test(value)
    ) {
      return value;
    }

    return "/";
  }
}
