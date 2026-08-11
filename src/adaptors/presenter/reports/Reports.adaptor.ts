import type { Request, Response } from "express";

export class ReportsAdaptor {
  renderReportsPage(req: Request, res: Response): void {
    res.render("reports/index");
  }
}
