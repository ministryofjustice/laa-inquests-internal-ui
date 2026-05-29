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
    const { userId } = await this.authPort.acquireTokenByCode(
      code,
      AUTH_SCOPES,
      this.redirectUri,
    );
    Object.assign(req.session, { userId });
    res.redirect("/");
  }

  logout(req: Request, res: Response, next: NextFunction): void {
    req.session.destroy((err) => {
      if (err !== undefined && err !== null) {
        next(err);
        return;
      }
      res.redirect(this.postLogoutUri);
    });
  }
}
