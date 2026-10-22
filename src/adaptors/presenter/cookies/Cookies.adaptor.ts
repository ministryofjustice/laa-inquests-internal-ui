import type { Request, Response } from "express";
import { logger } from "#src/infrastructure/logging/logger.js";
import { setCookies } from "#src/infrastructure/express/middleware/cookies/cookies.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";
import config from "#src/infrastructure/config/config.js";
import {
  ANALYTICS_COOKIE_NAME_PATTERN,
  COOKIE_PREFERENCE_MAX_AGE_MS,
} from "#src/infrastructure/locales/constants.js";


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

  saveBannerPreferences(req: Request, res: Response): void {
    const form = req.body as CookieBannerForm;
    req.session.cookieBannerState = "failed";
    res.locals.hasTrackingConsent = false;
    res.locals.showCookieBanner = true;

    if (form.cookies.additional !== "yes") {
      this.#clearAnalyticsCookies(req, res);
    }

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
    req.session.cookieBannerState =
      form.cookies.additional === "yes" ? "accepted" : "rejected";
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
    const form = req.body as CookiesPreferencesForm;
    req.session.cookieBannerState = "closed";
    res.redirect(this.#returnUrl(req.session.returnTo));
  }

  #clearAnalyticsCookies(req: Request, res: Response): void {
    const cookieNames = Object.keys(req.cookies).filter((name) =>
      ANALYTICS_COOKIE_NAME_PATTERN.test(name),
    );
    const domains: string[] = [];
    const { hostname } = req;
    if (!hostname.includes(":") && !/^[\d.]+$/v.test(hostname)) {
      const labels = hostname.split(".");
      while (labels.length > 1) {
        domains.push(labels.join("."));
        labels.shift();
      }
    }

    for (const name of cookieNames) {
      res.clearCookie(name, { path: "/" });
      for (const domain of domains) {
        res.clearCookie(name, { path: "/", domain });
      }
    }
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
