import type { Request, Response, NextFunction } from "express";
import { promisify } from "node:util";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";
import { startSessionLifetime } from "#src/infrastructure/express/session/sessionExpiry.js";
import { hashSessionId } from "#src/infrastructure/express/session/sessionHash.js";
import {
  type AuthFailureReason,
  logAuthLoginFailed,
  logSessionCreated,
  logSessionIdRotated,
  logSessionTerminated,
} from "#src/infrastructure/express/session/sessionAudit.js";
import { HTTP_BAD_REQUEST } from "#src/infrastructure/express/constants.js";
import {
  AUTH_FAILURE_REASONS,
  SESSION_TERMINATION_REASONS,
} from "#src/infrastructure/locales/constants.js";
import config from "#src/infrastructure/config/config.js";
import en from "#src/infrastructure/locales/en.json" with { type: "json" };

const CALLBACK_FUNCTION_NAME = "auth_adaptor_callback";
const LOGOUT_FUNCTION_NAME = "auth_adaptor_logout";

export class AuthAdaptor {
  constructor(
    private readonly authPort: AuthPort,
    private readonly redirectUri: string,
    private readonly postLogoutUri: string,
    private readonly authScopes: string[],
  ) {}

  async login(_req: Request, res: Response): Promise<void> {
    const url = await this.authPort.getAuthCodeUrl(
      this.authScopes,
      this.redirectUri,
    );
    res.redirect(url);
  }

  async callback(req: Request, res: Response): Promise<void> {
    const code =
      typeof req.query.code === "string" ? req.query.code : undefined;
    if (!code) {
      const reason =
        req.query.error === undefined
          ? AUTH_FAILURE_REASONS.MISSING_CODE
          : AUTH_FAILURE_REASONS.IDP_ERROR;
      logAuthLoginFailed(req, CALLBACK_FUNCTION_NAME, reason, req.query.error);
      res.status(HTTP_BAD_REQUEST).render("main/error", {
        status: HTTP_BAD_REQUEST,
        error: en.pages.error.invalidRequest,
      });
      return;
    }
    const user = await this.#failAs(
      req,
      AUTH_FAILURE_REASONS.TOKEN_ACQUISITION_FAILED,
      async () =>
        await this.authPort.acquireTokenByCode(
          code,
          this.authScopes,
          this.redirectUri,
        ),
    );
    const previousSessionHash = hashSessionId(req.sessionID);
    const previousSessionAuthenticated = req.session.user?.userId !== undefined;
    await this.#failAs(
      req,
      AUTH_FAILURE_REASONS.SESSION_REGENERATION_FAILED,
      async () => {
        await this.#regenerateSession(req);
      },
    );
    logSessionIdRotated(
      req,
      CALLBACK_FUNCTION_NAME,
      previousSessionHash,
      previousSessionAuthenticated,
    );
    await this.#failAs(
      req,
      AUTH_FAILURE_REASONS.INVALID_CREDENTIAL_EXPIRY,
      () => {
        startSessionLifetime(
          req.session,
          user.accessTokenExpiresOn,
          Date.now(),
        );
      },
    );
    Object.assign(req.session, {
      user: {
        userId: user.userId,
        userName: user.userName,
        accessToken: user.accessToken,
      },
      roles: user.roles,
    });
    logSessionCreated(req, CALLBACK_FUNCTION_NAME, "entra");
    res.redirect("/");
  }

  logout(req: Request, res: Response, next: NextFunction): void {
    const wasAuthenticated = req.session.user?.userId !== undefined;
    const sessionHash = hashSessionId(req.sessionID);
    req.session.destroy((err) => {
      res.clearCookie(config.session.name);
      if (err !== undefined && err !== null) {
        next(err);
        return;
      }
      if (wasAuthenticated) {
        logSessionTerminated(
          req,
          LOGOUT_FUNCTION_NAME,
          sessionHash,
          SESSION_TERMINATION_REASONS.USER_LOGOUT,
        );
      }
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(this.postLogoutUri)}`;
      res.redirect(url);
    });
  }

  // Records the audit failure and rethrows so the error middleware still owns the response.
  async #failAs<Result>(
    req: Request,
    reason: AuthFailureReason,
    step: () => Result | Promise<Result>,
  ): Promise<Result> {
    try {
      return await step();
    } catch (err: unknown) {
      logAuthLoginFailed(req, CALLBACK_FUNCTION_NAME, reason);
      throw err;
    }
  }

  async #regenerateSession(req: Request): Promise<void> {
    await promisify((callback: (err: unknown) => void): void => {
      req.session.regenerate(callback);
    })();
  }
}
