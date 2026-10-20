import type { Response } from "express";

export class HelpAdaptor {
  renderPage(res: Response): void {
    res.render("main/help");
  }
}
