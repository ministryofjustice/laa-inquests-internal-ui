import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { setCookies } from "#src/infrastructure/express/middleware/cookies/cookies.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";
import config from "#src/infrastructure/config/config.js";
import { COOKIE_PREFERENCE_MAX_AGE_MS } from "#src/infrastructure/locales/constants.js";

interface CookiesPreferencesForm {
  acceptCookies?: string;
}

interface CookiesPreferencesForm {
  returnTo?: string;
  acceptCookies?: string;
}

interface CookieBannerForm {
  cookies: {
    additional: string;
  };
  returnTo: string;
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
      setCookies(res, acceptCookies === "yes");
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

    let saved = true;
    try {
      setCookies(res, acceptCookies === "yes");
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

    res.redirect(
      `/cookies?saved=${saved}&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  saveBannerPreferences(req: Request, res: Response): void {
    const form = req.body as CookieBannerForm;

    res.cookie(
      "cookies_policy",
      JSON.stringify({
        has_tracking_consent: form.cookies.additional === "yes",
      }),
      {
        maxAge: COOKIE_PREFERENCE_MAX_AGE_MS,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: config.app.useHttps,
      },
    );
    logger.logInfo({
      functionName: "save_banner_preferences",
      message: "Cookie banner preference saved",
      request: req,
      extraContext: {
        event: "cookies_preferences_saved",
      },
    });
    res.redirect(this.#returnUrl(form.returnTo));
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
