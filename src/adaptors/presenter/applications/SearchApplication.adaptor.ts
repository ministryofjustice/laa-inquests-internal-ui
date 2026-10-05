import type { Request, Response } from "express";

export class SearchApplicationAdaptor {
  renderSearchApplicationPage(req: Request, res: Response): void {
    res.render("application/search");
  }
}
