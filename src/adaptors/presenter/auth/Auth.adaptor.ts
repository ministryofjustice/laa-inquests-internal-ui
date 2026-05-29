import type { Request, Response } from "express";
import type { AuthPort } from "#src/ports/auth/Auth.port.js";

export class AuthAdaptor {
  constructor(
    private readonly authPort: AuthPort,
    private readonly redirectUri: string,
    private readonly postLogoutUri: string,
  ) {}

  async login(_req: Request, _res: Response): Promise<void> {
    throw new Error("not implemented");
  }

  async callback(_req: Request, _res: Response): Promise<void> {
    throw new Error("not implemented");
  }

  logout(_req: Request, _res: Response): void {
    throw new Error("not implemented");
  }
}
