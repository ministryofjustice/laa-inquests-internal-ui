import { HTTP_INTERNAL_SERVER_ERROR } from "#src/infrastructure/express/constants.js";
import { logger } from "#src/infrastructure/logging/logger.js";
import { cookiePolicySchema } from "#src/adaptors/models/cookies.schema.js";
import { ANALYTICS_COOKIE_NAME_PATTERN } from "#src/infrastructure/locales/constants.js";
import type { Request, Response, NextFunction } from "express";

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

function clearAnalyticsCookies(req: Request, res: Response): void {
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

export function setCookies(
  req: Request,
  res: Response,
  acceptCookies: boolean,
): void {
  if (!acceptCookies) {
    clearAnalyticsCookies(req, res);
  }

  res.cookie(
    "cookies_policy",
    { has_tracking_consent: acceptCookies },
    { maxAge: ONE_YEAR_MS, httpOnly: true, sameSite: "strict" },
  );

  res.locals.hasTrackingConsent = acceptCookies;
}

function parseTrackingConsent(raw: unknown): boolean | undefined {
  const value: unknown =
    typeof raw === "string" ? JSON.parse(decodeURIComponent(raw)) : raw;
  const result = cookiePolicySchema.safeParse(value);
  if (result.success) {
    return result.data.has_tracking_consent;
  }
  return undefined;
}

export default function processCookies(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method === "GET") {
    try {
      const consent = parseTrackingConsent(req.cookies.cookies_policy);
      res.locals.hasTrackingConsent = consent === true;

      if (consent === undefined) {
        req.session.cookieBannerState = "initial";
      }
      const {
        session: { cookieBannerState },
      } = req;
      res.locals.cookieBannerState = cookieBannerState;

      if (
        ["accepted", "rejected"].includes(
          req.session.cookieBannerState as string,
        )
      ) {
        req.session.cookieBannerState = "closed"; // For next load
      }
    } catch (err) {
      res.locals.hasTrackingConsent = false;
      logger.logError({
        functionName: "process_cookies_middleware",
        message: "Processing cookies failed",
        err,
        request: req,
        extraContext: {
          event: "processing_cookies_failed",
          method: req.method,
          status_code: HTTP_INTERNAL_SERVER_ERROR,
        },
      });
    }
  }

  next();
}
