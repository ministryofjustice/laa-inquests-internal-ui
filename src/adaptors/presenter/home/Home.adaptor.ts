import type { Request, Response } from "express";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

export class HomeAdaptor {
  readonly #sessionHelper: SessionHelper;

  constructor(sessionHelper: SessionHelper) {
    this.#sessionHelper = sessionHelper;
  }

  renderHome(req: Request, res: Response): void {
    this.#sessionHelper.clearSessionData(req, "decision");
    res.render("main/index");
  }
}
