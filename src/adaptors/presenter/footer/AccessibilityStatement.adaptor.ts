import type { Response } from "express";

export class AccessibilityStatementAdaptor {
  renderPage(res: Response): void {
    res.render("main/accessibility-statement");
  }
}
