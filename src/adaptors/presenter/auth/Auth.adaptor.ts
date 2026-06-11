import type { Request, Response, NextFunction } from "express";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";

const AUTH_SCOPES = ["openid", "profile", "offline_access"];

export class AuthAdaptor {
  constructor(
    private readonly authPort: AuthPort,
    private readonly redirectUri: string,
    private readonly postLogoutUri: string,
  ) {}

  async login(_req: Request, res: Response): Promise<void> {
    const url = await this.authPort.getAuthCodeUrl(
      AUTH_SCOPES,
      this.redirectUri,
    );
    res.redirect(url);
  }

  async callback(req: Request, res: Response): Promise<void> {
    const { code } = req.query as { code: string };
    const user = await this.authPort.acquireTokenByCode(
      code,
      AUTH_SCOPES,
      this.redirectUri,
    );
    Object.assign(req.session, {
      user: { userId: user.userId, userName: user.userName },
    });
    res.redirect("/");
  }

  logout(req: Request, res: Response, next: NextFunction): void {
    req.session.destroy((err) => {
      if (err !== undefined && err !== null) {
        next(err);
        return;
      }
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${this.postLogoutUri}`;
      res.redirect(url);
    });
  }
}
