import type { Request, Response } from "express";

export class CookiesAdaptor {
  renderCookiesPage(req: Request, res: Response): void {
    res.render("main/cookies", { backUrl: "/" });
  }
}
