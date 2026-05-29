import type { Request, Response } from "express";
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
    const code = req.query["code"] as string;
    const result = await this.authPort.acquireTokenByCode(
      code,
      AUTH_SCOPES,
      this.redirectUri,
    );
    req.session["userId"] = result.userId;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err != null ? reject(err) : resolve()));
    });
    res.redirect("/");
  }

  logout(req: Request, res: Response): void {
    req.session.destroy(() => {
      res.redirect(this.postLogoutUri);
    });
  }
}
